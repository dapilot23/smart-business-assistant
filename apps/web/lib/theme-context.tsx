'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  colorThemes,
  typographies,
  ColorThemeName,
  TypographyName,
  COLOR_THEME_STORAGE_KEY,
  TYPOGRAPHY_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  DEFAULT_TYPOGRAPHY,
  isValidColorTheme,
  isValidTypography,
} from './themes';

interface ThemeContextValue {
  colorTheme: ColorThemeName;
  typography: TypographyName;
  setColorTheme: (theme: ColorThemeName) => void;
  setTypography: (typography: TypographyName) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyColorTheme(themeName: ColorThemeName) {
  const themeConfig = colorThemes[themeName];
  if (!themeConfig) return;

  const root = document.documentElement;
  Object.entries(themeConfig.colors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

function applyTypography(typographyName: TypographyName) {
  const typoConfig = typographies[typographyName];
  if (!typoConfig) return;

  const root = document.documentElement;
  Object.entries(typoConfig.fonts).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorThemeName>(DEFAULT_COLOR_THEME);
  const [typography, setTypographyState] = useState<TypographyName>(DEFAULT_TYPOGRAPHY);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const storedColor = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
      const storedTypo = localStorage.getItem(TYPOGRAPHY_STORAGE_KEY);

      const validColor = storedColor && isValidColorTheme(storedColor) ? storedColor : DEFAULT_COLOR_THEME;
      const validTypo = storedTypo && isValidTypography(storedTypo) ? storedTypo : DEFAULT_TYPOGRAPHY;

      setColorThemeState(validColor);
      setTypographyState(validTypo);
      applyColorTheme(validColor);
      applyTypography(validTypo);
    } catch {
      // localStorage may not be available
      applyColorTheme(DEFAULT_COLOR_THEME);
      applyTypography(DEFAULT_TYPOGRAPHY);
    }
    setIsLoaded(true);
  }, []);

  const setColorTheme = useCallback((newTheme: ColorThemeName) => {
    if (!colorThemes[newTheme]) return;

    setColorThemeState(newTheme);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage errors
    }
    applyColorTheme(newTheme);
  }, []);

  const setTypography = useCallback((newTypo: TypographyName) => {
    if (!typographies[newTypo]) return;

    setTypographyState(newTypo);
    try {
      localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, newTypo);
    } catch {
      // Ignore localStorage errors
    }
    applyTypography(newTypo);
  }, []);

  return (
    <ThemeContext.Provider value={{ colorTheme, typography, setColorTheme, setTypography, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
