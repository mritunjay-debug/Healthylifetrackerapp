export type ThemeTokens = {
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    mutedText: string;
    border: string;
    primary: string;
    accent: string;
    success: string;
    danger: string;
    info: string;
    shadow: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
};

export function getThemeTokens(isDark: boolean): ThemeTokens {
  if (isDark) {
    return {
      colors: {
        background: '#000000',
        surface: '#0F1115',
        surfaceElevated: '#151A22',
        text: '#FFFFFF',
        mutedText: '#A1A1AA',
        border: '#22252B',
        primary: '#0EA5E9',
        accent: '#F97316',
        success: '#10B981',
        danger: '#EF4444',
        info: '#6366F1',
        shadow: 'rgba(0,0,0,0.45)',
      },
      spacing: {
        xs: 6,
        sm: 10,
        md: 14,
        lg: 20,
        xl: 28,
        xxl: 40,
      },
      radius: {
        sm: 10,
        md: 14,
        lg: 18,
        xl: 24,
        pill: 999,
      },
    };
  }

  return {
    colors: {
      background: '#FFFFFF',
      surface: '#F7F8FC',
      surfaceElevated: '#EEF2FF',
      text: '#0B1020',
      mutedText: '#475569',
      border: '#E5E7EB',
      primary: '#0EA5E9',
      accent: '#F97316',
      success: '#10B981',
      danger: '#EF4444',
      info: '#6366F1',
      shadow: 'rgba(2,6,23,0.18)',
    },
    spacing: {
      xs: 6,
      sm: 10,
      md: 14,
      lg: 20,
      xl: 28,
      xxl: 40,
    },
    radius: {
      sm: 10,
      md: 14,
      lg: 18,
      xl: 24,
      pill: 999,
    },
  };
}

