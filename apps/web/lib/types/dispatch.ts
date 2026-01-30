export type SkillLevel = 'BASIC' | 'INTERMEDIATE' | 'EXPERT';

export interface TechnicianScore {
  userId: string;
  userName: string;
  skillLevel: SkillLevel | null;
  skillScore: number;
  proximityScore: number;
  workloadScore: number;
  totalScore: number;
  currentLocation?: { lat: number; lng: number };
  jobsToday: number;
}

export interface RouteStop {
  id: string;
  appointmentId: string;
  customerId: string;
  address: string;
  location: { lat: number; lng: number };
  scheduledAt: string;
  duration: number;
  order: number;
}

export interface OptimizedRouteResult {
  stops: RouteStop[];
  totalDistance: number;
  totalDuration: number;
  savings: {
    distance: number;
    time: number;
    percentage: number;
  };
}

export interface DispatchTechnician {
  id: string;
  name: string;
  status?: string;
}

export interface DispatchAppointment {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  customerName: string;
  serviceName: string;
  technicianId?: string;
  serviceId?: string;
}
