import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme.js';

export function Card({ children, style, ...props }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border
    }
  });
}
