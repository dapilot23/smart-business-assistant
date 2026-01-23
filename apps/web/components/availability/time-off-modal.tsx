'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  TimeOff,
  CreateTimeOffData,
  UpdateTimeOffData,
} from '@/lib/types/availability';

interface TimeOffModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateTimeOffData | UpdateTimeOffData) => Promise<void>;
  technicianId: string;
  timeOff?: TimeOff;
}

interface FormData {
  startDate: string;
  endDate: string;
  reason: string;
}

function initializeFormData(timeOff?: TimeOff): FormData {
  if (timeOff) {
    return {
      startDate: timeOff.start_date.split('T')[0],
      endDate: timeOff.end_date.split('T')[0],
      reason: timeOff.reason || '',
    };
  }

  const today = new Date().toISOString().split('T')[0];
  return {
    startDate: today,
    endDate: today,
    reason: '',
  };
}

export function TimeOffModal({
  open,
  onClose,
  onSave,
  technicianId,
  timeOff,
}: TimeOffModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(() =>
    initializeFormData(timeOff)
  );

  useEffect(() => {
    setFormData(initializeFormData(timeOff));
  }, [timeOff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: CreateTimeOffData | UpdateTimeOffData = timeOff
        ? {
            start_date: formData.startDate,
            end_date: formData.endDate,
            reason: formData.reason || undefined,
          }
        : {
            technician_id: technicianId,
            start_date: formData.startDate,
            end_date: formData.endDate,
            reason: formData.reason || undefined,
          };

      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save time off:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {timeOff ? 'Edit Time Off' : 'Schedule Time Off'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              min={formData.startDate}
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder="Vacation, personal, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
