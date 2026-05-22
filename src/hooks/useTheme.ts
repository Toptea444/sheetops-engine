import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'rose' | 'teal' | 'indigo' | 'amber';

const THEME_KEY = 'performanceTracker_theme';
const ACCENT_KEY = 'performanceTracker_accent';
const ACCENT_INITIALIZED_KEY = 'performanceTracker_accentInitialized';

const ALL_ACCENTS: AccentColor[] = ['blue', 'green', 'purple', 'orange', 'rose', 'teal', 'indigo', 'amber'];

function getRandomAccent(): AccentColor {
  const randomIndex = Math.floor(Math.random() * ALL_ACCENTS.length);
  return ALL_ACCENTS[randomIndex];
}
interface UseThemeResult {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  accentColor: AccentColor;
  setTheme: (theme: Theme) => void;
  setAccentColor: (accent: AccentColor) => void;
}

const accentColors: Record<AccentColor, { primary: string; chart1: string }> = {
  blue: {
    primary: '215 70% 35%',
    chart1: '215 70% 45%',
  },
  green: {
    primary: '145 60% 35%',
    chart1: '145 60% 45%',
  },
  purple: {
    primary: '270 60% 45%',
    chart1: '270 60% 55%',
  },
  orange: {
    primary: '25 90% 48%',
    chart1: '25 90% 55%',
  },
  rose: {
    primary: '350 70% 50%',
    chart1: '350 70% 55%',
  },
  teal: {
    primary: '175 75% 35%',
    chart1: '175 75% 45%',
  },
  indigo: {
    primary: '238 65% 35%',
    chart1: '238 65% 45%',
  },
  amber: {
    primary: '42 95% 35%',
    chart1: '42 95% 45%',
  },
};

export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>('light');
  const [accentColor, setAccentState] = useState<AccentColor>('blue');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Load saved preferences or initialize with random accent for new users
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const savedAccent = localStorage.getItem(ACCENT_KEY) as AccentColor | null;
    const accentInitialized = localStorage.getItem(ACCENT_INITIALIZED_KEY);

    if (savedTheme) {
      // Children’s day theme rollout: temporarily force everyone to light mode.
      localStorage.setItem(THEME_KEY, 'light');
    }
    
    if (savedAccent) {
      setAccentState(savedAccent);
    } else if (!accentInitialized) {
      // First-time user: assign a random accent color
      const randomAccent = getRandomAccent();
      setAccentState(randomAccent);
      localStorage.setItem(ACCENT_KEY, randomAccent);
      localStorage.setItem(ACCENT_INITIALIZED_KEY, 'true');
    }
  }, []);

  // Handle system theme changes and apply theme
  useEffect(() => {
    const updateResolvedTheme = () => {
      const resolved: 'light' | 'dark' = 'light';

      setResolvedTheme(resolved);

      // Apply to document
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);

      // Update Android status bar / PWA theme-color dynamically
      const themeColorValue = resolved === 'dark' ? '#09090b' : '#ffffff';
      document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
        meta.setAttribute('content', themeColorValue);
      });
    };

    updateResolvedTheme();
    return undefined;
  }, [theme]);

  // Apply accent color
  useEffect(() => {
    const root = document.documentElement;
    const colors = accentColors[accentColor];

    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--chart-1', colors.chart1);

    // Update ring color to match
    root.style.setProperty('--ring', colors.primary.replace('35%', '45%'));
  }, [accentColor]);

  const setTheme = useCallback((newTheme: Theme) => {
    // Ignore requested value and keep everyone in light mode.
    setThemeState('light');
    localStorage.setItem(THEME_KEY, 'light');
  }, []);

  const setAccentColor = useCallback((newAccent: AccentColor) => {
    setAccentState(newAccent);
    localStorage.setItem(ACCENT_KEY, newAccent);
  }, []);

  return {
    theme,
    resolvedTheme,
    accentColor,
    setTheme,
    setAccentColor,
  };
}

export type { Theme, AccentColor };
