import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export const dynamic = "force-dynamic";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function DemoLoginForm() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
      <h1 className="text-2xl font-bold text-center mb-6">Demo Mode Login</h1>
      <p className="text-gray-600 text-center mb-6">
        This is a demo environment. Click below to access the dashboard.
      </p>
      <Link
        href="/dashboard"
        className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Enter Dashboard
      </Link>
      <p className="text-sm text-gray-500 text-center mt-4">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      {isDemoMode ? (
        <DemoLoginForm />
      ) : (
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white shadow-xl",
            },
          }}
        />
      )}
    </div>
  );
}
