import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeTokens, getThemeTokens } from '../lib/theme/tokens';

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  tokens: ThemeTokens;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  const toggleTheme = () => setIsDark(!isDark);

  const tokens = useMemo(() => getThemeTokens(isDark), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, tokens }}>
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