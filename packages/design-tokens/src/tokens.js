export const lightTokens = {
  colorScheme: 'light',
  colors: {
    background: '#ffffff',
    foreground: '#0a0a0a',
    muted: '#6b7280',
    card: '#f8fafc',
    input: 'rgba(0, 0, 0, 0.04)',
    border: 'rgba(0, 0, 0, 0.18)',
    borderStrong: 'rgba(0, 0, 0, 0.28)',
    mint: '#3ad4a7',
    primary: '#3ad4a7',
    primaryText: '#0a0a0a',
    error: '#b91c1c',
    uiDarkBg: '#0b0f1a',
    uiDarkFg: '#f8fafc',
    uiDarkMuted: 'rgba(248, 250, 252, 0.7)',
    uiDarkBorder: 'rgba(248, 250, 252, 0.16)',
    uiDarkBorderStrong: 'rgba(248, 250, 252, 0.28)',
    uiLightBg: '#ffffff',
    uiLightFg: '#0a0a0a',
    uiLightMuted: '#6b7280',
    uiLightBorder: 'rgba(0, 0, 0, 0.18)',
    uiLightBorderStrong: 'rgba(0, 0, 0, 0.28)'
  },
  radii: {
    md: '12px',
    sm: '10px'
  },
  shadows: {
    md: '0 18px 60px rgba(0, 0, 0, 0.18)'
  },
  rings: {
    md: '0 0 0 3px rgba(0, 0, 0, 0.18)'
  },
  spaces: {
    xxsmall: '4px',
    xsmall: '8px',
    small: '12px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '40px',
    xxxlarge: '56px',
    jumbo: '72px',
    sectionVerticalPadding: '120px'
  },
  fonts: {
    base: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
  }
};

export const darkTokens = {
  colorScheme: 'dark',
  colors: {
    background: '#0a0a0a',
    foreground: '#f8fafc',
    muted: 'rgba(248, 250, 252, 0.7)',
    card: '#121212',
    input: 'rgba(255, 255, 255, 0.06)',
    border: 'rgba(248, 250, 252, 0.14)',
    borderStrong: 'rgba(248, 250, 252, 0.26)',
    mint: 'rgba(58, 212, 167, 0.6)',
    primary: 'rgba(58, 212, 167, 0.6)',
    primaryText: '#0a0a0a',
    error: '#fb7185',
    uiDarkBg: '#06080f',
    uiDarkFg: '#0a0a0a',
    uiDarkMuted: '#6b7280',
    uiDarkBorder: 'rgba(0, 0, 0, 0.18)',
    uiDarkBorderStrong: 'rgba(0, 0, 0, 0.28)',
    uiLightBg: '#0a0a0a',
    uiLightFg: '#f8fafc',
    uiLightMuted: 'rgba(248, 250, 252, 0.7)',
    uiLightBorder: 'rgba(248, 250, 252, 0.14)',
    uiLightBorderStrong: 'rgba(248, 250, 252, 0.26)'
  },
  radii: {
    md: '12px',
    sm: '10px'
  },
  shadows: {
    md: '0 18px 60px rgba(0, 0, 0, 0.45)'
  },
  rings: {
    md: '0 0 0 3px rgba(238, 242, 255, 0.16)'
  },
  spaces: {
    xxsmall: '4px',
    xsmall: '8px',
    small: '12px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '40px',
    xxxlarge: '56px',
    jumbo: '72px',
    sectionVerticalPadding: '120px'
  },
  fonts: {
    base: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
  }
};

export function getTokens(mode) {
  return mode === 'dark' ? darkTokens : lightTokens;
}

export const tokens = {
  light: lightTokens,
  dark: darkTokens
};

