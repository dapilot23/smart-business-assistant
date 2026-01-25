"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppointmentStats } from '@/lib/api/reports';

interface AppointmentsChartProps {
  data: AppointmentStats[];
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'hsl(var(--primary))',
  confirmed: '#10b981',
  completed: '#3b82f6',
  cancelled: '#ef4444',
  pending: '#f59e0b',
};

export function AppointmentsChart({ data }: AppointmentsChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = data.map(item => ({
    status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    count: item.count,
    fill: STATUS_COLORS[item.status] || 'hsl(var(--primary))',
  }));

  if (!mounted) {
    return (
      <div className="bg-[var(--background)] border border-[var(--border)] shadow-sm rounded-lg p-6">
        <h3 className="font-primary text-lg font-semibold text-[var(--foreground)] mb-6">
          Appointments by Status
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <span className="text-[var(--muted-foreground)]">Loading chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] border border-[var(--border)] shadow-sm rounded-lg p-6">
      <h3 className="font-primary text-lg font-semibold text-[var(--foreground)] mb-6">
        Appointments by Status
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="status"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
            cursor={{ fill: 'var(--secondary)' }}
          />
          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
