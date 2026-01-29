"use client";

import { useState, useEffect, memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RevenueDataPoint } from '@/lib/api/reports';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

export const RevenueChart = memo(function RevenueChart({ data }: RevenueChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Format data for chart
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: item.amount,
  }));

  if (!mounted) {
    return (
      <div className="bg-[var(--background)] border border-[var(--border)] shadow-sm rounded-lg p-6">
        <h3 className="font-primary text-lg font-semibold text-[var(--foreground)] mb-6">
          Revenue Trend
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
        Revenue Trend
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            stroke="var(--border)"
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
            formatter={(value) => [`$${(value as number)?.toLocaleString() ?? 0}`, 'Revenue']}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
