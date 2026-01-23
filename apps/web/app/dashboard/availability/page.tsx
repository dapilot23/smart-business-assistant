'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  AvailabilitySchedule,
  TimeOffList,
  TimeOffModal,
} from '@/components/availability';
import {
  WeeklySchedule,
  TimeOff,
  CreateTimeOffData,
  UpdateTimeOffData,
} from '@/lib/types/availability';

// Mock technician ID - replace with actual user context
const MOCK_TECHNICIAN_ID = 'tech-1';

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState<WeeklySchedule[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOff | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      const mockSchedule: WeeklySchedule[] = [];
      const mockTimeOffs: TimeOff[] = [];

      setSchedule(mockSchedule);
      setTimeOffs(mockTimeOffs);
    } catch (error) {
      console.error('Failed to load availability data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSchedule(scheduleData: Partial<WeeklySchedule>[]) {
    try {
      // TODO: Replace with actual API call
      console.log('Saving schedule:', scheduleData);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadData();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      throw error;
    }
  }

  async function handleSaveTimeOff(
    data: CreateTimeOffData | UpdateTimeOffData
  ) {
    try {
      if (editingTimeOff) {
        // TODO: Replace with actual API call to update
        console.log('Updating time off:', editingTimeOff.id, data);
      } else {
        // TODO: Replace with actual API call to create
        console.log('Creating time off:', data);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadData();
      setShowTimeOffModal(false);
      setEditingTimeOff(undefined);
    } catch (error) {
      console.error('Failed to save time off:', error);
      throw error;
    }
  }

  async function handleDeleteTimeOff(id: string) {
    try {
      // TODO: Replace with actual API call
      console.log('Deleting time off:', id);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadData();
    } catch (error) {
      console.error('Failed to delete time off:', error);
    }
  }

  function handleEditTimeOff(timeOff: TimeOff) {
    setEditingTimeOff(timeOff);
    setShowTimeOffModal(true);
  }

  function handleCloseModal() {
    setShowTimeOffModal(false);
    setEditingTimeOff(undefined);
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Availability Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage your weekly schedule and time off
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <AvailabilitySchedule
            technicianId={MOCK_TECHNICIAN_ID}
            schedule={schedule}
            onSave={handleSaveSchedule}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowTimeOffModal(true)}>
              Schedule Time Off
            </Button>
          </div>

          <TimeOffList
            timeOffs={timeOffs}
            onEdit={handleEditTimeOff}
            onDelete={handleDeleteTimeOff}
          />
        </div>
      </div>

      <TimeOffModal
        open={showTimeOffModal}
        onClose={handleCloseModal}
        onSave={handleSaveTimeOff}
        technicianId={MOCK_TECHNICIAN_ID}
        timeOff={editingTimeOff}
      />
    </div>
  );
}
