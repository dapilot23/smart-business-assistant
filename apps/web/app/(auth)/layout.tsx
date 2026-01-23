export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Smart Business Assistant
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-powered business automation
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
