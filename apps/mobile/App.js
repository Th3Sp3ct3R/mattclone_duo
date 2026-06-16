import { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';

import { RootNavigator } from '@/navigation/RootNavigator.jsx';
import { bootstrapEnv } from '@/bootstrap/env.js';
import { analytics } from '@/analytics/client.js';
import { notifications } from '@/notifications/client.js';
import { api, setUnauthorizedHandler } from '@julio/api-client';
import { AnalyticsEvents, trackEvent } from '@julio/analytics';
import { createValidationT, initValidation } from '@julio/validation';
import { createNavigationTheme, ThemeProvider, useTheme } from '@julio/ui-native';

function AppShell() {
  const { theme } = useTheme();
  bootstrapEnv();
  // Mobile doesn’t have i18n wired yet; use shared validation translations for now.
  initValidation({ t: createValidationT('en') });

  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const res = await api.auth.me();
        if (!cancelled) setUser(res.user || null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setStatus('ready');
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const auth = useMemo(() => {
    return {
      status,
      user,
      async login({ email, password }) {
        const res = await api.auth.login({ email, password });
        setUser(res.user || null);
        trackEvent(analytics, AnalyticsEvents.LoginSucceeded, { platform: 'mobile' });
        return res;
      },
      async logout() {
        try {
          await api.auth.logout();
          trackEvent(analytics, AnalyticsEvents.Logout, { platform: 'mobile' });
        } catch (error) {
          notifications.notify({
            title: 'Logout failed',
            message: error?.message || 'Unable to log out right now.'
          });
        } finally {
          setUser(null);
        }
      }
    };
  }, [status, user]);

  const navigationTheme = useMemo(() => createNavigationTheme(theme), [theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator auth={auth} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}


