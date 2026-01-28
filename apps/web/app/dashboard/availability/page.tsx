'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
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
import * as availabilityApi from '@/lib/api/availability';

export default function AvailabilityPage() {
  const { userId } = useAuth();
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
      const [scheduleData, timeOffData] = await Promise.all([
        availabilityApi.getSchedule(),
        availabilityApi.getTimeOffs(),
      ]);
      setSchedule(scheduleData);
      setTimeOffs(timeOffData);
    } catch (error) {
      console.error('Failed to load availability data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSchedule(scheduleData: Partial<WeeklySchedule>[]) {
    try {
      for (const item of scheduleData) {
        if (item.id) {
          await availabilityApi.updateSchedule(item.id, item);
        } else if (item.technician_id) {
          await availabilityApi.createSchedule(item as WeeklySchedule);
        }
      }
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
        await availabilityApi.updateTimeOff(editingTimeOff.id, data as UpdateTimeOffData);
      } else {
        await availabilityApi.createTimeOff(data as CreateTimeOffData);
      }
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
      await availabilityApi.deleteTimeOff(id);
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
            technicianId={userId ?? ''}
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
        technicianId={userId ?? ''}
        timeOff={editingTimeOff}
      />
    </div>
  );
}
