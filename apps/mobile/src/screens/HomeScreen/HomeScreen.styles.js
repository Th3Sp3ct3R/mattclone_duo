import { StyleSheet } from 'react-native';

export function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: theme.colors.background
    },
    heading: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: 10
    },
    muted: {
      color: theme.colors.muted,
      marginBottom: 14
    },
    statusHeading: {
      color: theme.colors.foreground,
      fontWeight: '700'
    },
    statusMeta: {
      color: theme.colors.muted,
      marginTop: 6
    },
    themeToggleRow: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    themeToggleLabel: {
      color: theme.colors.muted,
      fontSize: 13
    },
    themeToggleButton: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10
    },
    themeToggleButtonText: {
      color: theme.colors.foreground,
      fontWeight: '600'
    }
  });
}


