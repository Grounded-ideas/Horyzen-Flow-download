import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { themesData } from '../lib/themes';

export interface ThemeColors {
  sidebarBg: string;
  editorBg: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  accentMuted: string;
  borderColor: string;
  buttonBg: string;
  buttonHover: string;
  sidebarItemActive: string;
  sidebarItemHover: string;
  pageOutlineColor: string;
}

export interface Theme {
  id: string;
  name: string;
  isDefault: boolean;
  light: ThemeColors;
  dark: ThemeColors;
}

interface ThemeContextType {
  themes: Record<string, Theme>;
  themeOrder: string[];
  currentThemeId: string;
  isDarkMode: boolean;
  activeColors: ThemeColors;
  typography: {
    fontSize: string;
    lineHeight: string;
    maxWidth: string;
  };
  setTheme: (themeId: string) => void;
  toggleDarkMode: () => void;
  setTypography: (key: string, value: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved && themesData.themes[saved]) return saved;
    return 'brand'; // Default to Brand theme
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('app-color-mode');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [typography, setTypographyState] = useState(() => {
    const saved = localStorage.getItem('app-typography');
    if (saved) return JSON.parse(saved);
    return {
      fontSize: "20px",
      lineHeight: "1.8",
      maxWidth: "800px"
    };
  });
  
  const currentTheme = themesData.themes[currentThemeId];
  const activeColors = isDarkMode ? currentTheme.dark : currentTheme.light;
  
  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    
    Object.entries(activeColors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Apply typography variables
    root.style.setProperty('--flow-font-size', typography.fontSize);
    root.style.setProperty('--flow-line-height', typography.lineHeight);
    root.style.setProperty('--flow-max-width', typography.maxWidth);
    
    // Apply dark class for Tailwind dark mode
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('app-theme', currentThemeId);
    localStorage.setItem('app-color-mode', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('app-typography', JSON.stringify(typography));
  }, [currentThemeId, isDarkMode, activeColors, typography]);
  
  const setTheme = useCallback((themeId: string) => {
    if (themesData.themes[themeId]) {
      setCurrentThemeId(themeId);
    }
  }, []);
  
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const setTypography = useCallback((key: string, value: string) => {
    setTypographyState(prev => ({ ...prev, [key]: value }));
  }, []);
  
  return (
    <ThemeContext.Provider value={{
      themes: themesData.themes,
      themeOrder: themesData.themeOrder,
      currentThemeId,
      isDarkMode,
      activeColors,
      typography,
      setTheme,
      toggleDarkMode,
      setTypography
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
