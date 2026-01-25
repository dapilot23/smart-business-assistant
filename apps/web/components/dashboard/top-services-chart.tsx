"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TopService } from '@/lib/api/reports';

interface TopServicesChartProps {
  data: TopService[];
}

export function TopServicesChart({ data }: TopServicesChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = data
    .slice(0, 5) // Show top 5
    .map(item => ({
      name: item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name,
      count: item.count,
      revenue: item.revenue,
    }));

  if (!mounted) {
    return (
      <div className="bg-[var(--background)] border border-[var(--border)] shadow-sm rounded-lg p-6">
        <h3 className="font-primary text-lg font-semibold text-[var(--foreground)] mb-6">
          Top Services
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
        Top Services
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            stroke="var(--border)"
            width={150}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(value, name) => [
              name === 'revenue' ? `$${(value as number)?.toLocaleString() ?? 0}` : value,
              name === 'revenue' ? 'Revenue' : 'Bookings',
            ]}
            cursor={{ fill: 'var(--secondary)' }}
          />
          <Bar
            dataKey="count"
            fill="hsl(var(--primary))"
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
