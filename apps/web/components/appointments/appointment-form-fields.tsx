'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Customer, Service, Technician } from '@/lib/types/appointment';

interface FormData {
  customer_id: string;
  service_id: string;
  technician_id: string;
  date: string;
  time: string;
  notes: string;
}

interface AppointmentFormFieldsProps {
  formData: FormData;
  onChange: (field: keyof FormData, value: string) => void;
  customers: Customer[];
  services: Service[];
  technicians: Technician[];
}

export function AppointmentFormFields({
  formData,
  onChange,
  customers,
  services,
  technicians,
}: AppointmentFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="customer">Customer *</Label>
        <Select
          value={formData.customer_id}
          onValueChange={(value) => onChange('customer_id', value)}
          required
        >
          <SelectTrigger id="customer">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.first_name} {customer.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service">Service *</Label>
        <Select
          value={formData.service_id}
          onValueChange={(value) => onChange('service_id', value)}
          required
        >
          <SelectTrigger id="service">
            <SelectValue placeholder="Select service" />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} ({service.duration_minutes} min)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="technician">Technician</Label>
        <Select
          value={formData.technician_id}
          onValueChange={(value) => onChange('technician_id', value)}
        >
          <SelectTrigger id="technician">
            <SelectValue placeholder="Select technician (optional)" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {tech.first_name} {tech.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => onChange('date', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Time *</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => onChange('time', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Add any additional notes..."
          rows={3}
        />
      </div>
    </>
  );
}
