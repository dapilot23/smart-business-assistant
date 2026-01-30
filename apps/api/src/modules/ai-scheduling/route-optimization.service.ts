import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../config/prisma/prisma.service';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteStop {
  id: string;
  appointmentId: string;
  customerId: string;
  address: string;
  location: Coordinate;
  scheduledAt: Date;
  duration: number;
  order: number;
}

export interface OptimizedRouteResult {
  stops: RouteStop[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  savings: {
    distance: number;
    time: number;
    percentage: number;
  };
}

@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);
  private readonly googleMapsApiKey: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.googleMapsApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!this.googleMapsApiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY not configured - route optimization will use simple distance');
    }
  }

  /**
   * Optimize route for a technician's appointments on a given day
   */
  async optimizeRoute(
    tenantId: string,
    technicianId: string,
    date: Date,
  ): Promise<OptimizedRouteResult> {
    // Get appointments for the technician on this day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        assignedTo: technicianId,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        customer: {
          include: { location: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (appointments.length <= 1) {
      // No optimization needed for 0 or 1 appointments
      return {
        stops: appointments.map((a, i) => this.appointmentToStop(a, i)),
        totalDistance: 0,
        totalDuration: 0,
        savings: { distance: 0, time: 0, percentage: 0 },
      };
    }

    // Get geocoded locations
    const stops = await this.prepareStops(appointments);

    // Calculate original order distance
    const originalDistance = this.calculateTotalDistance(stops);

    // Optimize using nearest neighbor algorithm (or Google API if available)
    const optimizedStops = this.googleMapsApiKey
      ? await this.optimizeWithGoogleMaps(stops)
      : this.optimizeWithNearestNeighbor(stops);

    // Calculate optimized distance
    const optimizedDistance = this.calculateTotalDistance(optimizedStops);

    // Estimate travel time (assuming 30 km/h average in urban areas)
    const totalDuration = Math.round((optimizedDistance / 30) * 60);

    // Save the optimized route
    await this.prisma.optimizedRoute.upsert({
      where: {
        tenantId_technicianId_date: {
          tenantId,
          technicianId,
          date: startOfDay,
        },
      },
      create: {
        tenantId,
        technicianId,
        date: startOfDay,
        totalDistance: optimizedDistance,
        totalDuration,
        stops: optimizedStops as any,
        status: 'PENDING',
      },
      update: {
        totalDistance: optimizedDistance,
        totalDuration,
        stops: optimizedStops as any,
        optimizedAt: new Date(),
        status: 'PENDING',
      },
    });

    const savings = {
      distance: originalDistance - optimizedDistance,
      time: Math.round(((originalDistance - optimizedDistance) / 30) * 60),
      percentage: originalDistance > 0
        ? Math.round(((originalDistance - optimizedDistance) / originalDistance) * 100)
        : 0,
    };

    this.logger.log(
      `Route optimized for ${technicianId}: ${appointments.length} stops, ` +
      `saved ${savings.distance.toFixed(1)}km (${savings.percentage}%)`,
    );

    return {
      stops: optimizedStops,
      totalDistance: optimizedDistance,
      totalDuration,
      savings,
    };
  }

  /**
   * Get the optimized route for a technician
   */
  async getOptimizedRoute(tenantId: string, technicianId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.optimizedRoute.findUnique({
      where: {
        tenantId_technicianId_date: {
          tenantId,
          technicianId,
          date: startOfDay,
        },
      },
    });
  }

  /**
   * Apply the optimized route (update appointment times if needed)
   */
  async applyRoute(routeId: string): Promise<void> {
    const route = await this.prisma.optimizedRoute.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      throw new Error('Route not found');
    }

    await this.prisma.optimizedRoute.update({
      where: { id: routeId },
      data: { status: 'APPLIED', appliedAt: new Date() },
    });

    this.logger.log(`Applied optimized route ${routeId}`);
  }

  /**
   * Update technician location
   */
  async updateTechnicianLocation(
    userId: string,
    tenantId: string,
    location: { latitude: number; longitude: number; accuracy?: number; heading?: number; speed?: number },
    status?: 'IDLE' | 'EN_ROUTE' | 'ON_SITE' | 'BREAK' | 'OFFLINE',
  ): Promise<void> {
    await this.prisma.technicianLocation.create({
      data: {
        userId,
        tenantId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        status: status || 'IDLE',
      },
    });
  }

  /**
   * Get latest technician location
   */
  async getTechnicianLocation(userId: string) {
    return this.prisma.technicianLocation.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /**
   * Geocode a customer address
   */
  async geocodeCustomerAddress(customerId: string): Promise<{ lat: number; lng: number } | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { location: true },
    });

    if (!customer?.address) {
      return null;
    }

    // If already geocoded, return cached coordinates
    if (customer.location?.geocoded && customer.location.latitude && customer.location.longitude) {
      return { lat: customer.location.latitude, lng: customer.location.longitude };
    }

    // Geocode using Google Maps API
    if (this.googleMapsApiKey) {
      try {
        const coords = await this.geocodeAddress(customer.address);
        if (coords) {
          await this.prisma.customerLocation.upsert({
            where: { customerId },
            create: {
              customerId,
              tenantId: customer.tenantId,
              address: customer.address,
              latitude: coords.lat,
              longitude: coords.lng,
              geocoded: true,
              geocodedAt: new Date(),
            },
            update: {
              latitude: coords.lat,
              longitude: coords.lng,
              geocoded: true,
              geocodedAt: new Date(),
            },
          });
          return coords;
        }
      } catch (error) {
        this.logger.error(`Geocoding failed for ${customerId}: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Calculate ETA to a destination
   */
  async calculateETA(
    technicianId: string,
    destinationLat: number,
    destinationLng: number,
  ): Promise<{ minutes: number; distance: number } | null> {
    const location = await this.getTechnicianLocation(technicianId);
    if (!location) {
      return null;
    }

    const distance = this.haversineDistance(
      { lat: location.latitude, lng: location.longitude },
      { lat: destinationLat, lng: destinationLng },
    );

    // Estimate time at 30 km/h average speed
    const minutes = Math.round((distance / 30) * 60);

    return { minutes, distance };
  }

  // Private helper methods

  private appointmentToStop(appointment: any, order: number): RouteStop {
    return {
      id: `stop-${order}`,
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      address: appointment.customer?.address || 'Unknown',
      location: {
        lat: appointment.customer?.location?.latitude || 0,
        lng: appointment.customer?.location?.longitude || 0,
      },
      scheduledAt: appointment.scheduledAt,
      duration: appointment.duration,
      order,
    };
  }

  private async prepareStops(appointments: any[]): Promise<RouteStop[]> {
    const stops: RouteStop[] = [];

    for (let i = 0; i < appointments.length; i++) {
      const appt = appointments[i];
      let location: Coordinate = { lat: 0, lng: 0 };

      if (appt.customer?.location?.latitude && appt.customer?.location?.longitude) {
        location = {
          lat: appt.customer.location.latitude,
          lng: appt.customer.location.longitude,
        };
      } else if (appt.customer?.address) {
        // Try to geocode
        const coords = await this.geocodeCustomerAddress(appt.customer.id);
        if (coords) {
          location = coords;
        }
      }

      stops.push({
        id: `stop-${i}`,
        appointmentId: appt.id,
        customerId: appt.customerId,
        address: appt.customer?.address || 'Unknown',
        location,
        scheduledAt: appt.scheduledAt,
        duration: appt.duration,
        order: i,
      });
    }

    return stops;
  }

  private optimizeWithNearestNeighbor(stops: RouteStop[]): RouteStop[] {
    if (stops.length <= 2) {
      return stops;
    }

    const optimized: RouteStop[] = [];
    const remaining = [...stops];

    // Start with the earliest appointment
    remaining.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    optimized.push(remaining.shift()!);
    optimized[0].order = 0;

    while (remaining.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearestIdx = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = this.haversineDistance(current.location, remaining[i].location);
        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearestIdx = i;
        }
      }

      const next = remaining.splice(nearestIdx, 1)[0];
      next.order = optimized.length;
      optimized.push(next);
    }

    return optimized;
  }

  private async optimizeWithGoogleMaps(stops: RouteStop[]): Promise<RouteStop[]> {
    if (!this.googleMapsApiKey) {
      return this.optimizeWithNearestNeighbor(stops);
    }

    const maxStops = 10;
    if (stops.length > maxStops) {
      this.logger.warn(
        `Google Maps optimization supports up to ${maxStops} stops. Falling back to nearest neighbor.`,
      );
      return this.optimizeWithNearestNeighbor(stops);
    }

    try {
      const locations = stops.map(
        (stop) => `${stop.location.lat},${stop.location.lng}`,
      );
      const encodedOrigins = encodeURIComponent(locations.join('|'));
      const encodedDestinations = encodedOrigins;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedOrigins}&destinations=${encodedDestinations}&mode=driving&key=${this.googleMapsApiKey}`,
      );
      const data = await response.json();

      if (data.status !== 'OK' || !Array.isArray(data.rows)) {
        this.logger.warn(
          `Distance Matrix API error: ${data.status || 'Unknown error'}`,
        );
        return this.optimizeWithNearestNeighbor(stops);
      }

      const distanceMatrix: number[][] = data.rows.map((row: any) =>
        (row.elements || []).map((element: any) =>
          element.status === 'OK' ? element.distance.value : Infinity,
        ),
      );

      if (distanceMatrix.length !== stops.length) {
        this.logger.warn('Distance matrix size mismatch, using nearest neighbor');
        return this.optimizeWithNearestNeighbor(stops);
      }

      return this.optimizeWithDistanceMatrix(stops, distanceMatrix);
    } catch (error) {
      this.logger.error(`Distance Matrix API failed: ${error.message}`);
      return this.optimizeWithNearestNeighbor(stops);
    }
  }

  private optimizeWithDistanceMatrix(
    stops: RouteStop[],
    distances: number[][],
  ): RouteStop[] {
    if (stops.length <= 2) {
      return stops;
    }

    let startIndex = 0;
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].scheduledAt < stops[startIndex].scheduledAt) {
        startIndex = i;
      }
    }

    const remaining = new Set<number>();
    for (let i = 0; i < stops.length; i++) {
      if (i !== startIndex) remaining.add(i);
    }

    const ordered: RouteStop[] = [];
    ordered.push(stops[startIndex]);
    ordered[0].order = 0;

    while (remaining.size > 0) {
      const currentIndex = stops.indexOf(ordered[ordered.length - 1]);
      let nearestIndex: number | null = null;
      let nearestDistance = Infinity;

      for (const idx of remaining) {
        const distance = distances[currentIndex]?.[idx] ?? Infinity;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = idx;
        }
      }

      if (nearestIndex === null || nearestDistance === Infinity) {
        for (const idx of remaining) {
          const distance = this.haversineDistance(
            stops[currentIndex].location,
            stops[idx].location,
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = idx;
          }
        }
      }

      if (nearestIndex === null) {
        break;
      }

      const nextStop = stops[nearestIndex];
      nextStop.order = ordered.length;
      ordered.push(nextStop);
      remaining.delete(nearestIndex);
    }

    return ordered;
  }

  private calculateTotalDistance(stops: RouteStop[]): number {
    let total = 0;
    for (let i = 1; i < stops.length; i++) {
      total += this.haversineDistance(stops[i - 1].location, stops[i].location);
    }
    return total;
  }

  private haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371; // Earth's radius in km

    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lng - coord1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.lat)) *
        Math.cos(this.toRad(coord2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async geocodeAddress(address: string): Promise<Coordinate | null> {
    if (!this.googleMapsApiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleMapsApiKey}`,
      );
      const data = await response.json();

      if (data.results && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
    } catch (error) {
      this.logger.error(`Geocoding error: ${error.message}`);
    }

    return null;
  }
}
