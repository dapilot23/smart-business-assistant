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
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Availability Management</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Manage your weekly schedule and time off
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="order-1">
          <AvailabilitySchedule
            technicianId={MOCK_TECHNICIAN_ID}
            schedule={schedule}
            onSave={handleSaveSchedule}
          />
        </div>

        <div className="space-y-4 order-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold lg:hidden">Time Off</h2>
            <Button onClick={() => setShowTimeOffModal(true)} size="sm" className="sm:hidden">
              + Add
            </Button>
            <Button onClick={() => setShowTimeOffModal(true)} className="hidden sm:flex">
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
