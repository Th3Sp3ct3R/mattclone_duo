import { useEffect, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DateTime } from 'luxon';

import { analytics } from '@/analytics/client.js';
import { HomeScreenConfig } from '@/screens/HomeScreen/HomeScreen.config.js';
import { createStyles } from '@/screens/HomeScreen/HomeScreen.styles.js';
import { AnalyticsEvents, trackEvent } from '@julio/analytics';
import { Button, Card, useTheme } from '@julio/ui-native';

export function HomeScreen({ auth }) {
  const { theme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const now = DateTime.now().toLocaleString(DateTime.DATETIME_MED);

  useEffect(() => {
    trackEvent(analytics, AnalyticsEvents.PageViewed, { page: 'home', platform: 'mobile' });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{HomeScreenConfig.heading}</Text>
      <Text style={styles.muted}>It’s {now}.</Text>

      <Card>
        <Text style={styles.statusHeading}>Signed in</Text>
        <Text style={styles.statusMeta}>
          {auth.user?.email || '—'} ({auth.user?.role || 'unknown'})
        </Text>

        <Button onPress={auth.logout} leadingIconName="logout">
          Logout
        </Button>

        <View style={styles.themeToggleRow}>
          <Text style={styles.themeToggleLabel}>Theme</Text>
          <TouchableOpacity
            style={styles.themeToggleButton}
            onPress={toggleTheme}
            accessibilityRole="button"
          >
            <Text style={styles.themeToggleButtonText}>
              {theme.mode === 'dark' ? 'Light mode' : 'Dark mode'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}


