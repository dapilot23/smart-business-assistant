import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Business Assistant",
  description: "AI-powered business assistant for service businesses",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart Business Assistant",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#111111",
};

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en" className="h-full">
      <body
        className={`${jetbrainsMono.variable} ${inter.variable} antialiased h-full`}
      >
        {children}
      </body>
    </html>
  );

  // In demo mode, skip Clerk entirely
  if (isDemoMode) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
