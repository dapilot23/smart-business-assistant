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
        <Label htmlFor="customer" className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Customer *
        </Label>
        <Select
          value={formData.customer_id}
          onValueChange={(value) => onChange('customer_id', value)}
          required
        >
          <SelectTrigger
            id="customer"
            className="rounded-xl border-white/10 bg-white/5 text-slate-100 focus:border-emerald-400/60 focus:ring-0"
          >
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.first_name} {customer.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service" className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Service *
        </Label>
        <Select
          value={formData.service_id}
          onValueChange={(value) => onChange('service_id', value)}
          required
        >
          <SelectTrigger
            id="service"
            className="rounded-xl border-white/10 bg-white/5 text-slate-100 focus:border-emerald-400/60 focus:ring-0"
          >
            <SelectValue placeholder="Select service" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} ({service.duration_minutes} min)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="technician" className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Technician
        </Label>
        <Select
          value={formData.technician_id}
          onValueChange={(value) => onChange('technician_id', value)}
        >
          <SelectTrigger
            id="technician"
            className="rounded-xl border-white/10 bg-white/5 text-slate-100 focus:border-emerald-400/60 focus:ring-0"
          >
            <SelectValue placeholder="Select technician (optional)" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
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
          <Label htmlFor="date" className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Date *
          </Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => onChange('date', e.target.value)}
            required
            className="rounded-xl border-white/10 bg-white/5 text-slate-100 focus:border-emerald-400/60 focus-visible:ring-0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time" className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Time *
          </Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => onChange('time', e.target.value)}
            required
            className="rounded-xl border-white/10 bg-white/5 text-slate-100 focus:border-emerald-400/60 focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Notes
        </Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Add any additional notes..."
          rows={3}
          className="rounded-xl border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/60 focus-visible:ring-0"
        />
      </div>
    </>
  );
}
