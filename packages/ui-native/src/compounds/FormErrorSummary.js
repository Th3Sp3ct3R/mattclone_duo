import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme.js';

export function FormErrorSummary({ messages = [], status = null }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasMessages = Array.isArray(messages) && messages.length > 0;
  const hasStatus = Boolean(status);

  if (!hasMessages && !hasStatus) return null;

  return (
    <View style={styles.container}>
      {hasMessages
        ? messages.map((message) => (
            <Text key={message} style={styles.text}>
              {message}
            </Text>
          ))
        : null}
      {hasStatus ? <Text style={styles.text}>{String(status)}</Text> : null}
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12
    },
    text: {
      color: theme.colors.error,
      marginBottom: 4
    }
  });
}
