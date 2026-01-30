import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import dynamic from "next/dynamic";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

// Only load Clerk when not in demo mode (reduces bundle by ~50KB)
const ClerkProvider = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.ClerkProvider),
  { ssr: true }
);

// Inline script to apply theme before hydration (prevents flash)
const themeScript = `
(function() {
  try {
    var colorTheme = localStorage.getItem('sba-color-theme') || 'default';
    var typography = localStorage.getItem('sba-typography') || 'modern';

    var colors = {
      default: { '--primary': '#f97316', '--primary-hover': '#fb923c', '--primary-muted': '#f9731620', '--ring': '#f97316', '--accent': '#1e3a5f' },
      amber: { '--primary': '#f59e0b', '--primary-hover': '#fbbf24', '--primary-muted': '#f59e0b20', '--ring': '#f59e0b', '--accent': '#451a03' },
      coral: { '--primary': '#f97171', '--primary-hover': '#fca5a5', '--primary-muted': '#f9717120', '--ring': '#f97171', '--accent': '#7f1d1d' },
      bronze: { '--primary': '#cd7f32', '--primary-hover': '#daa06d', '--primary-muted': '#cd7f3220', '--ring': '#cd7f32', '--accent': '#5c3d2e' },
      ocean: { '--primary': '#0ea5e9', '--primary-hover': '#38bdf8', '--primary-muted': '#0ea5e920', '--ring': '#0ea5e9', '--accent': '#164e63' },
      sapphire: { '--primary': '#3b82f6', '--primary-hover': '#60a5fa', '--primary-muted': '#3b82f620', '--ring': '#3b82f6', '--accent': '#1e3a8a' },
      teal: { '--primary': '#14b8a6', '--primary-hover': '#2dd4bf', '--primary-muted': '#14b8a620', '--ring': '#14b8a6', '--accent': '#134e4a' },
      slate: { '--primary': '#64748b', '--primary-hover': '#94a3b8', '--primary-muted': '#64748b20', '--ring': '#64748b', '--accent': '#1e293b' },
      forest: { '--primary': '#22c55e', '--primary-hover': '#4ade80', '--primary-muted': '#22c55e20', '--ring': '#22c55e', '--accent': '#14532d' },
      emerald: { '--primary': '#10b981', '--primary-hover': '#34d399', '--primary-muted': '#10b98120', '--ring': '#10b981', '--accent': '#064e3b' },
      sunset: { '--primary': '#f472b6', '--primary-hover': '#f9a8d4', '--primary-muted': '#f472b620', '--ring': '#f472b6', '--accent': '#831843' },
      rose: { '--primary': '#fb7185', '--primary-hover': '#fda4af', '--primary-muted': '#fb718520', '--ring': '#fb7185', '--accent': '#9f1239' },
      midnight: { '--primary': '#a855f7', '--primary-hover': '#c084fc', '--primary-muted': '#a855f720', '--ring': '#a855f7', '--accent': '#3b0764' },
      lavender: { '--primary': '#818cf8', '--primary-hover': '#a5b4fc', '--primary-muted': '#818cf820', '--ring': '#818cf8', '--accent': '#312e81' },
      ruby: { '--primary': '#e11d48', '--primary-hover': '#f43f5e', '--primary-muted': '#e11d4820', '--ring': '#e11d48', '--accent': '#881337' }
    };

    // Use system fonts as fallback for non-default typography themes
    // This reduces initial font download from 10 fonts to 2
    var fonts = {
      modern: { '--font-primary-family': 'var(--font-jetbrains-mono), "JetBrains Mono", monospace', '--font-secondary-family': 'var(--font-inter), "Inter", sans-serif' },
      classic: { '--font-primary-family': '"Source Code Pro", "Menlo", monospace', '--font-secondary-family': '"Lato", system-ui, sans-serif' },
      minimal: { '--font-primary-family': '"Fira Code", "Menlo", monospace', '--font-secondary-family': '"Open Sans", system-ui, sans-serif' },
      technical: { '--font-primary-family': '"IBM Plex Mono", "Menlo", monospace', '--font-secondary-family': '"IBM Plex Sans", system-ui, sans-serif' },
      elegant: { '--font-primary-family': '"Roboto Mono", "Menlo", monospace', '--font-secondary-family': '"Poppins", system-ui, sans-serif' },
      friendly: { '--font-primary-family': '"Fira Code", "Menlo", monospace', '--font-secondary-family': '"Poppins", system-ui, sans-serif' },
      bold: { '--font-primary-family': 'var(--font-jetbrains-mono), "JetBrains Mono", monospace', '--font-secondary-family': '"Lato", system-ui, sans-serif' },
      clean: { '--font-primary-family': '"Source Code Pro", "Menlo", monospace', '--font-secondary-family': 'var(--font-inter), "Inter", sans-serif' }
    };

    var c = colors[colorTheme] || colors.default;
    var f = fonts[typography] || fonts.modern;
    var root = document.documentElement;
    for (var prop in c) { root.style.setProperty(prop, c[prop]); }
    for (var prop in f) { root.style.setProperty(prop, f[prop]); }
  } catch (e) {}
})();
`;

// Only load 2 fonts (default theme) - reduces bundle by ~80KB
// Other themes use system font fallbacks for better performance
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fontVariables = `${jetbrainsMono.variable} ${inter.variable}`;

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
  const innerContent = isDemoMode ? (
    <ThemeProvider>{children}</ThemeProvider>
  ) : (
    <ClerkProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ClerkProvider>
  );

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${fontVariables} antialiased h-full`}>
        {innerContent}
      </body>
    </html>
  );
}
