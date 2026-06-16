import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@julio/icons';
import { useTheme } from '../theme.js';

const sizeTokens = {
  sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 14, iconSize: 16 },
  md: { paddingVertical: 10, paddingHorizontal: 14, fontSize: 16, iconSize: 18 },
  lg: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 17, iconSize: 20 }
};

const variants = ['primary', 'secondary', 'outline', 'ghost', 'subtle', 'danger', 'link'];

function resolveIconColor({ variant, disabled, theme }) {
  if (disabled) return theme.colors.muted;
  if (variant === 'primary' || variant === 'danger') return theme.colors.primaryText;
  return theme.colors.foreground;
}

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIconName,
  trailingIconName,
  disabled = false,
  children,
  ...props
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedVariant = variants.includes(variant) ? variant : 'primary';
  const resolvedSize = sizeTokens[size] ? size : 'md';
  const iconColor = resolveIconColor({ variant: resolvedVariant, disabled, theme });
  const iconSize = sizeTokens[resolvedSize].iconSize;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[resolvedVariant],
        styles[resolvedSize],
        pressed && !disabled ? styles[`${resolvedVariant}Pressed`] : null,
        disabled ? styles.disabled : null
      ]}
      {...props}
    >
      <View style={styles.content}>
        {leadingIconName ? (
          <View style={[styles.icon, styles.iconLeading]}>
            <Icon name={leadingIconName} size={iconSize} color={iconColor} />
          </View>
        ) : null}
        <Text style={[styles.label, styles[`${resolvedSize}Label`], styles[`${resolvedVariant}Label`]]}>
          {children}
        </Text>
        {trailingIconName ? (
          <View style={[styles.icon, styles.iconTrailing]}>
            <Icon name={trailingIconName} size={iconSize} color={iconColor} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    base: {
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row'
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    label: {
      fontWeight: '600'
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center'
    },
    iconLeading: {
      marginRight: 8
    },
    iconTrailing: {
      marginLeft: 8
    },
    smLabel: {
      fontSize: sizeTokens.sm.fontSize
    },
    mdLabel: {
      fontSize: sizeTokens.md.fontSize
    },
    lgLabel: {
      fontSize: sizeTokens.lg.fontSize
    },
    sm: {
      paddingVertical: sizeTokens.sm.paddingVertical,
      paddingHorizontal: sizeTokens.sm.paddingHorizontal
    },
    md: {
      paddingVertical: sizeTokens.md.paddingVertical,
      paddingHorizontal: sizeTokens.md.paddingHorizontal
    },
    lg: {
      paddingVertical: sizeTokens.lg.paddingVertical,
      paddingHorizontal: sizeTokens.lg.paddingHorizontal
    },
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary
    },
    primaryPressed: {
      opacity: 0.9
    },
    primaryLabel: {
      color: theme.colors.primaryText
    },
    secondary: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.borderStrong
    },
    secondaryPressed: {
      backgroundColor: theme.colors.inputBackground
    },
    secondaryLabel: {
      color: theme.colors.foreground
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.borderStrong
    },
    outlinePressed: {
      backgroundColor: theme.colors.inputBackground
    },
    outlineLabel: {
      color: theme.colors.foreground
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent'
    },
    ghostPressed: {
      backgroundColor: theme.colors.inputBackground
    },
    ghostLabel: {
      color: theme.colors.foreground
    },
    subtle: {
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.border
    },
    subtlePressed: {
      backgroundColor: theme.colors.border
    },
    subtleLabel: {
      color: theme.colors.foreground
    },
    danger: {
      backgroundColor: theme.colors.error,
      borderColor: theme.colors.error
    },
    dangerPressed: {
      opacity: 0.9
    },
    dangerLabel: {
      color: theme.colors.primaryText
    },
    link: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      paddingVertical: 0,
      paddingHorizontal: 0
    },
    linkPressed: {
      opacity: 0.7
    },
    linkLabel: {
      color: theme.colors.foreground,
      textDecorationLine: 'underline'
    },
    disabled: {
      opacity: 0.6
    }
  });
}

