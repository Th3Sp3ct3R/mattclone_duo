import { useEffect, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useFormik } from 'formik';

import { analytics } from '@/analytics/client.js';
import { notifications } from '@/notifications/client.js';
import { createValidationT, flattenValidationErrors, loginSchema } from '@julio/validation';
import { AnalyticsEvents, trackEvent } from '@julio/analytics';
import { LoginScreenConfig } from '@/screens/LoginScreen/LoginScreen.config.js';
import { createStyles } from '@/screens/LoginScreen/LoginScreen.styles.js';
import { Button, Card, FormErrorSummary, TextField, useTheme } from '@julio/ui-native';

export function LoginScreen({ auth }) {
  const { theme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const t = createValidationT('en');

  useEffect(() => {
    trackEvent(analytics, AnalyticsEvents.PageViewed, { page: 'login', platform: 'mobile' });
  }, []);

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values, helpers) => {
      helpers.setStatus(null);
      try {
        await auth.login(values);
      } catch (e) {
        const message = e?.message || 'Login failed';
        helpers.setStatus(message);
        trackEvent(analytics, AnalyticsEvents.LoginFailed, { platform: 'mobile' });
        notifications.notify({ title: 'Login failed', message });
      }
    }
  });
  const summaryMessages =
    formik.submitCount > 0 ? flattenValidationErrors(formik.errors).map(t) : [];

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.heading}>{LoginScreenConfig.heading}</Text>

        <FormErrorSummary
          messages={summaryMessages}
          status={formik.status ? String(formik.status) : null}
        />

        <TextField
          label="Email"
          value={formik.values.email}
          onChangeText={(text) => formik.setFieldValue('email', text)}
          onBlur={() => formik.setFieldTouched('email', true)}
          keyboardType="email-address"
          autoCapitalize="none"
          error={formik.touched.email && formik.errors.email ? t(String(formik.errors.email)) : null}
        />

        <TextField
          label="Password"
          value={formik.values.password}
          onChangeText={(text) => formik.setFieldValue('password', text)}
          onBlur={() => formik.setFieldTouched('password', true)}
          secureTextEntry
          error={
            formik.touched.password && formik.errors.password
              ? t(String(formik.errors.password))
              : null
          }
        />

        <Button
          onPress={formik.handleSubmit}
          disabled={formik.isSubmitting}
          leadingIconName="lock"
        >
          {formik.isSubmitting ? 'Signing in…' : 'Sign in'}
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


