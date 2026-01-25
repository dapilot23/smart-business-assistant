// Color Themes - Just accent colors, independent of fonts
export type ColorThemeName =
  | 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight'
  | 'ruby' | 'amber' | 'emerald' | 'sapphire' | 'rose'
  | 'lavender' | 'coral' | 'teal' | 'slate' | 'bronze';

export interface ColorTheme {
  name: ColorThemeName;
  label: string;
  colors: {
    '--primary': string;
    '--primary-hover': string;
    '--primary-muted': string;
    '--ring': string;
    '--accent': string;
  };
  preview: string; // Main preview color
}

export const colorThemes: Record<ColorThemeName, ColorTheme> = {
  // Warm tones
  default: {
    name: 'default',
    label: 'Orange',
    colors: {
      '--primary': '#f97316',
      '--primary-hover': '#fb923c',
      '--primary-muted': '#f9731620',
      '--ring': '#f97316',
      '--accent': '#1e3a5f',
    },
    preview: '#f97316',
  },
  amber: {
    name: 'amber',
    label: 'Amber',
    colors: {
      '--primary': '#f59e0b',
      '--primary-hover': '#fbbf24',
      '--primary-muted': '#f59e0b20',
      '--ring': '#f59e0b',
      '--accent': '#451a03',
    },
    preview: '#f59e0b',
  },
  coral: {
    name: 'coral',
    label: 'Coral',
    colors: {
      '--primary': '#f97171',
      '--primary-hover': '#fca5a5',
      '--primary-muted': '#f9717120',
      '--ring': '#f97171',
      '--accent': '#7f1d1d',
    },
    preview: '#f97171',
  },
  bronze: {
    name: 'bronze',
    label: 'Bronze',
    colors: {
      '--primary': '#cd7f32',
      '--primary-hover': '#daa06d',
      '--primary-muted': '#cd7f3220',
      '--ring': '#cd7f32',
      '--accent': '#5c3d2e',
    },
    preview: '#cd7f32',
  },

  // Cool tones
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    colors: {
      '--primary': '#0ea5e9',
      '--primary-hover': '#38bdf8',
      '--primary-muted': '#0ea5e920',
      '--ring': '#0ea5e9',
      '--accent': '#164e63',
    },
    preview: '#0ea5e9',
  },
  sapphire: {
    name: 'sapphire',
    label: 'Sapphire',
    colors: {
      '--primary': '#3b82f6',
      '--primary-hover': '#60a5fa',
      '--primary-muted': '#3b82f620',
      '--ring': '#3b82f6',
      '--accent': '#1e3a8a',
    },
    preview: '#3b82f6',
  },
  teal: {
    name: 'teal',
    label: 'Teal',
    colors: {
      '--primary': '#14b8a6',
      '--primary-hover': '#2dd4bf',
      '--primary-muted': '#14b8a620',
      '--ring': '#14b8a6',
      '--accent': '#134e4a',
    },
    preview: '#14b8a6',
  },
  slate: {
    name: 'slate',
    label: 'Slate',
    colors: {
      '--primary': '#64748b',
      '--primary-hover': '#94a3b8',
      '--primary-muted': '#64748b20',
      '--ring': '#64748b',
      '--accent': '#1e293b',
    },
    preview: '#64748b',
  },

  // Green tones
  forest: {
    name: 'forest',
    label: 'Forest',
    colors: {
      '--primary': '#22c55e',
      '--primary-hover': '#4ade80',
      '--primary-muted': '#22c55e20',
      '--ring': '#22c55e',
      '--accent': '#14532d',
    },
    preview: '#22c55e',
  },
  emerald: {
    name: 'emerald',
    label: 'Emerald',
    colors: {
      '--primary': '#10b981',
      '--primary-hover': '#34d399',
      '--primary-muted': '#10b98120',
      '--ring': '#10b981',
      '--accent': '#064e3b',
    },
    preview: '#10b981',
  },

  // Pink/Purple tones
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    colors: {
      '--primary': '#f472b6',
      '--primary-hover': '#f9a8d4',
      '--primary-muted': '#f472b620',
      '--ring': '#f472b6',
      '--accent': '#831843',
    },
    preview: '#f472b6',
  },
  rose: {
    name: 'rose',
    label: 'Rose',
    colors: {
      '--primary': '#fb7185',
      '--primary-hover': '#fda4af',
      '--primary-muted': '#fb718520',
      '--ring': '#fb7185',
      '--accent': '#9f1239',
    },
    preview: '#fb7185',
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    colors: {
      '--primary': '#a855f7',
      '--primary-hover': '#c084fc',
      '--primary-muted': '#a855f720',
      '--ring': '#a855f7',
      '--accent': '#3b0764',
    },
    preview: '#a855f7',
  },
  lavender: {
    name: 'lavender',
    label: 'Lavender',
    colors: {
      '--primary': '#818cf8',
      '--primary-hover': '#a5b4fc',
      '--primary-muted': '#818cf820',
      '--ring': '#818cf8',
      '--accent': '#312e81',
    },
    preview: '#818cf8',
  },
  ruby: {
    name: 'ruby',
    label: 'Ruby',
    colors: {
      '--primary': '#e11d48',
      '--primary-hover': '#f43f5e',
      '--primary-muted': '#e11d4820',
      '--ring': '#e11d48',
      '--accent': '#881337',
    },
    preview: '#e11d48',
  },
};

// Typography Options - Font pairings independent of colors
export type TypographyName =
  | 'modern' | 'classic' | 'minimal' | 'technical' | 'elegant'
  | 'friendly' | 'bold' | 'clean';

export interface Typography {
  name: TypographyName;
  label: string;
  description: string;
  fonts: {
    '--font-primary-family': string;
    '--font-secondary-family': string;
  };
  preview: {
    primary: string;
    secondary: string;
  };
}

export const typographies: Record<TypographyName, Typography> = {
  modern: {
    name: 'modern',
    label: 'Modern',
    description: 'JetBrains Mono + Inter',
    fonts: {
      '--font-primary-family': 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
      '--font-secondary-family': 'var(--font-inter), "Inter", sans-serif',
    },
    preview: {
      primary: 'JetBrains Mono',
      secondary: 'Inter',
    },
  },
  classic: {
    name: 'classic',
    label: 'Classic',
    description: 'Source Code Pro + Lato',
    fonts: {
      '--font-primary-family': 'var(--font-source-code-pro), "Source Code Pro", monospace',
      '--font-secondary-family': 'var(--font-lato), "Lato", sans-serif',
    },
    preview: {
      primary: 'Source Code Pro',
      secondary: 'Lato',
    },
  },
  minimal: {
    name: 'minimal',
    label: 'Minimal',
    description: 'Fira Code + Open Sans',
    fonts: {
      '--font-primary-family': 'var(--font-fira-code), "Fira Code", monospace',
      '--font-secondary-family': 'var(--font-open-sans), "Open Sans", sans-serif',
    },
    preview: {
      primary: 'Fira Code',
      secondary: 'Open Sans',
    },
  },
  technical: {
    name: 'technical',
    label: 'Technical',
    description: 'IBM Plex Mono + IBM Plex Sans',
    fonts: {
      '--font-primary-family': 'var(--font-ibm-plex-mono), "IBM Plex Mono", monospace',
      '--font-secondary-family': 'var(--font-ibm-plex-sans), "IBM Plex Sans", sans-serif',
    },
    preview: {
      primary: 'IBM Plex Mono',
      secondary: 'IBM Plex Sans',
    },
  },
  elegant: {
    name: 'elegant',
    label: 'Elegant',
    description: 'Roboto Mono + Poppins',
    fonts: {
      '--font-primary-family': 'var(--font-roboto-mono), "Roboto Mono", monospace',
      '--font-secondary-family': 'var(--font-poppins), "Poppins", sans-serif',
    },
    preview: {
      primary: 'Roboto Mono',
      secondary: 'Poppins',
    },
  },
  friendly: {
    name: 'friendly',
    label: 'Friendly',
    description: 'Fira Code + Poppins',
    fonts: {
      '--font-primary-family': 'var(--font-fira-code), "Fira Code", monospace',
      '--font-secondary-family': 'var(--font-poppins), "Poppins", sans-serif',
    },
    preview: {
      primary: 'Fira Code',
      secondary: 'Poppins',
    },
  },
  bold: {
    name: 'bold',
    label: 'Bold',
    description: 'JetBrains Mono + Lato',
    fonts: {
      '--font-primary-family': 'var(--font-jetbrains-mono), "JetBrains Mono", monospace',
      '--font-secondary-family': 'var(--font-lato), "Lato", sans-serif',
    },
    preview: {
      primary: 'JetBrains Mono',
      secondary: 'Lato',
    },
  },
  clean: {
    name: 'clean',
    label: 'Clean',
    description: 'Source Code Pro + Inter',
    fonts: {
      '--font-primary-family': 'var(--font-source-code-pro), "Source Code Pro", monospace',
      '--font-secondary-family': 'var(--font-inter), "Inter", sans-serif',
    },
    preview: {
      primary: 'Source Code Pro',
      secondary: 'Inter',
    },
  },
};

// Storage keys
export const COLOR_THEME_STORAGE_KEY = 'sba-color-theme';
export const TYPOGRAPHY_STORAGE_KEY = 'sba-typography';

// Defaults
export const DEFAULT_COLOR_THEME: ColorThemeName = 'default';
export const DEFAULT_TYPOGRAPHY: TypographyName = 'modern';

// Validation helpers
export const colorThemeNames = Object.keys(colorThemes) as ColorThemeName[];
export const typographyNames = Object.keys(typographies) as TypographyName[];

export function isValidColorTheme(theme: string): theme is ColorThemeName {
  return colorThemeNames.includes(theme as ColorThemeName);
}

export function isValidTypography(typography: string): typography is TypographyName {
  return typographyNames.includes(typography as TypographyName);
}
