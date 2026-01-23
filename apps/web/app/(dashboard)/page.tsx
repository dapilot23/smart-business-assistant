export default function DashboardPage() {
  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Smart Business Assistant dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Calls"
          value="1,234"
          description="+20% from last month"
        />
        <StatsCard
          title="Messages"
          value="456"
          description="+15% from last month"
        />
        <StatsCard
          title="Active Tenants"
          value="12"
          description="+2 new this month"
        />
        <StatsCard
          title="Revenue"
          value="$12,345"
          description="+25% from last month"
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-2xl font-semibold">Recent Activity</h2>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground">
            No recent activity to display. Your activity will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
