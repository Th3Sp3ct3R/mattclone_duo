import { darkTokens, lightTokens } from './tokens.js';

function toCssVars(mode, tokens) {
  return [
    `:root${mode === 'dark' ? "[data-theme='dark']" : ''} {`,
    `  color-scheme: ${tokens.colorScheme};`,
    `  --ui-bg: ${tokens.colors.background};`,
    `  --ui-fg: ${tokens.colors.foreground};`,
    `  --ui-muted: ${tokens.colors.muted};`,
    `  --ui-card: ${tokens.colors.card};`,
    `  --ui-input: ${tokens.colors.input};`,
    `  --ui-border: ${tokens.colors.border};`,
    `  --ui-border-strong: ${tokens.colors.borderStrong};`,
    `  --ui-mint: ${tokens.colors.mint};`,
    `  --ui-primary: ${tokens.colors.primary};`,
    `  --ui-primary-contrast: ${tokens.colors.primaryText};`,
    `  --ui-error: ${tokens.colors.error};`,
    `  --ui-dark-bg: ${tokens.colors.uiDarkBg};`,
    `  --ui-dark-fg: ${tokens.colors.uiDarkFg};`,
    `  --ui-dark-muted: ${tokens.colors.uiDarkMuted};`,
    `  --ui-dark-border: ${tokens.colors.uiDarkBorder};`,
    `  --ui-dark-border-strong: ${tokens.colors.uiDarkBorderStrong};`,
    `  --ui-light-bg: ${tokens.colors.uiLightBg};`,
    `  --ui-light-fg: ${tokens.colors.uiLightFg};`,
    `  --ui-light-muted: ${tokens.colors.uiLightMuted};`,
    `  --ui-light-border: ${tokens.colors.uiLightBorder};`,
    `  --ui-light-border-strong: ${tokens.colors.uiLightBorderStrong};`,
    `  --ui-radius: ${tokens.radii.md};`,
    `  --ui-radius-sm: ${tokens.radii.sm};`,
    `  --ui-shadow: ${tokens.shadows.md};`,
    `  --ui-ring: ${tokens.rings.md};`,
    `  --ui-space-xxsmall: ${tokens.spaces.xxsmall};`,
    `  --ui-space-xsmall: ${tokens.spaces.xsmall};`,
    `  --ui-space-small: ${tokens.spaces.small};`,
    `  --ui-space-medium: ${tokens.spaces.medium};`,
    `  --ui-space-large: ${tokens.spaces.large};`,
    `  --ui-space-xlarge: ${tokens.spaces.xlarge};`,
    `  --ui-space-xxlarge: ${tokens.spaces.xxlarge};`,
    `  --ui-space-xxxlarge: ${tokens.spaces.xxxlarge};`,
    `  --ui-space-jumbo: ${tokens.spaces.jumbo};`,
    `  --ui-space-section-vertical-padding: ${tokens.spaces.sectionVerticalPadding};`,
    `  --ui-font: ${tokens.fonts.base};`,
    `}`
  ].join('\n');
}

export function buildTokensCss() {
  return `${toCssVars('light', lightTokens)}\n\n${toCssVars('dark', darkTokens)}\n`;
}

