'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Service } from '@/lib/types/booking';
import { Clock, DollarSign } from 'lucide-react';

interface ServiceSelectorProps {
  services: Service[];
  selectedService?: Service;
  onSelect: (service: Service) => void;
}

export function ServiceSelector({ services, selectedService, onSelect }: ServiceSelectorProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No services available at this time.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const isSelected = selectedService?.id === service.id;

        return (
          <Card
            key={service.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelect(service)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{service.name}</CardTitle>
              {service.description && (
                <CardDescription className="line-clamp-2">{service.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>{service.durationMinutes} minutes</span>
              </div>
              {service.price && (
                <div className="flex items-center text-sm font-medium">
                  <DollarSign className="mr-2 h-4 w-4" />
                  <span>${service.price.toFixed(2)}</span>
                </div>
              )}
              <Button
                className="w-full mt-4"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
              >
                {isSelected ? 'Selected' : 'Select'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
