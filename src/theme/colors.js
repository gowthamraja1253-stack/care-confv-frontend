export const theme = {
  colors: {
    // Backgrounds & Surfaces (Crisp, High-Contrast White & Purple)
    background: '#F8F9FE',
    cardBackground: '#FFFFFF',
    cardBackgroundHover: '#FAF5FF',
    cardBorder: '#E9D5FF',
    cardBorderHover: '#C084FC',
    
    // Purple Accent Palette
    purplePrimary: '#6D28D9', // Deep Purple (WCAG AAA contrast against white)
    purpleLight: '#7C3AED',
    purpleDark: '#5B21B6',
    purpleTints: '#F3E8FF',
    purpleBorder: '#DDD6FE',
    purpleGlow: 'rgba(109, 40, 217, 0.15)',

    // Supporting Accessible Accents
    emeraldSuccess: '#059669', // Dark emerald
    emeraldBg: '#ECFDF5',
    emeraldBorder: '#A7F3D0',
    
    amberWarning: '#D97706', // High contrast amber
    amberBg: '#FFFBEB',
    amberBorder: '#FDE68A',
    
    roseAlert: '#DC2626', // High contrast red
    roseBg: '#FEF2F2',
    roseBorder: '#FECACA',
    
    skyAction: '#0284C7',
    skyBg: '#F0F9FF',

    // Typography (Optimized for High Readability & Elderly Eyesight)
    textPrimary: '#1E1B4B', // Deepest Indigo/Black
    textSecondary: '#475569', // Dark Slate (very readable)
    textMuted: '#64748B',
    textPurple: '#6D28D9',
    textWhite: '#FFFFFF',
    
    // Status
    onlinePillBg: '#ECFDF5',
    onlinePillBorder: '#6EE7B7',
    onlineDot: '#059669',
  },
  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  shadows: {
    card: '0 4px 16px -2px rgba(109, 40, 217, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    cardHover: '0 8px 24px -4px rgba(109, 40, 217, 0.14)',
    nav: '0 -4px 20px rgba(109, 40, 217, 0.08)',
  }
};

export default theme;
