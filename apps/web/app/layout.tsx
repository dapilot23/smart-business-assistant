import type { Metadata, Viewport } from "next";
import {
  JetBrains_Mono,
  Inter,
  Fira_Code,
  Source_Code_Pro,
  Roboto_Mono,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Open_Sans,
  Lato,
  Poppins,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

// Inline script to apply theme before hydration (prevents flash)
// This must be kept in sync with the themes in lib/themes.ts
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

    var fonts = {
      modern: { '--font-primary-family': 'var(--font-jetbrains-mono), "JetBrains Mono", monospace', '--font-secondary-family': 'var(--font-inter), "Inter", sans-serif' },
      classic: { '--font-primary-family': 'var(--font-source-code-pro), "Source Code Pro", monospace', '--font-secondary-family': 'var(--font-lato), "Lato", sans-serif' },
      minimal: { '--font-primary-family': 'var(--font-fira-code), "Fira Code", monospace', '--font-secondary-family': 'var(--font-open-sans), "Open Sans", sans-serif' },
      technical: { '--font-primary-family': 'var(--font-ibm-plex-mono), "IBM Plex Mono", monospace', '--font-secondary-family': 'var(--font-ibm-plex-sans), "IBM Plex Sans", sans-serif' },
      elegant: { '--font-primary-family': 'var(--font-roboto-mono), "Roboto Mono", monospace', '--font-secondary-family': 'var(--font-poppins), "Poppins", sans-serif' },
      friendly: { '--font-primary-family': 'var(--font-fira-code), "Fira Code", monospace', '--font-secondary-family': 'var(--font-poppins), "Poppins", sans-serif' },
      bold: { '--font-primary-family': 'var(--font-jetbrains-mono), "JetBrains Mono", monospace', '--font-secondary-family': 'var(--font-lato), "Lato", sans-serif' },
      clean: { '--font-primary-family': 'var(--font-source-code-pro), "Source Code Pro", monospace', '--font-secondary-family': 'var(--font-inter), "Inter", sans-serif' }
    };

    var c = colors[colorTheme] || colors.default;
    var f = fonts[typography] || fonts.modern;
    var root = document.documentElement;
    for (var prop in c) { root.style.setProperty(prop, c[prop]); }
    for (var prop in f) { root.style.setProperty(prop, f[prop]); }
  } catch (e) {}
})();
`;

// Primary fonts (monospace)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Secondary fonts (sans-serif)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Combine all font variables
const fontVariables = [
  jetbrainsMono.variable,
  firaCode.variable,
  sourceCodePro.variable,
  robotoMono.variable,
  ibmPlexMono.variable,
  inter.variable,
  openSans.variable,
  lato.variable,
  poppins.variable,
  ibmPlexSans.variable,
].join(" ");

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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${fontVariables} antialiased h-full`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );

  // In demo mode, skip Clerk entirely
  if (isDemoMode) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
