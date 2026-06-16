'use client';

import { useEffect, useMemo, useState } from 'react';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import {
  createValidationT,
  flattenValidationErrors,
  passwordChangeSchema,
  profileSchema
} from '@julio/validation';
import {
  applyThemePreference,
  Button,
  Card,
  FormErrorSummary,
  ImageUpload,
  Input,
  loadThemePreference,
  resolveSystemThemePreference,
  saveThemePreference,
  Spinner,
  Switch
} from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';

export default function SettingsPage() {
  const t = useMemo(() => createValidationT('en'), []);
  const [profileInitial, setProfileInitial] = useState({ name: '', email: '', avatarUrl: '' });
  const [theme, setTheme] = useState('light');
  const [pageStatus, setPageStatus] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadTheme() {
      const stored = await loadThemePreference();
      const preferred = stored || resolveSystemThemePreference();
      if (!active) return;
      setTheme(preferred);
      applyThemePreference(preferred);
    }
    loadTheme();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      setPageStatus(null);
      try {
        const data = await api.users.getMe();
        if (!active) return;
        setProfileInitial({
          name: data.user?.name || '',
          email: data.user?.email || '',
          avatarUrl: data.user?.avatarUrl || ''
        });
      } catch (err) {
        if (!active) return;
        const message = err?.message || 'Failed to load settings';
        setPageStatus(message);
        notifications.notify({ title: 'Settings load failed', message });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const profileFormik = useFormik({
    initialValues: profileInitial,
    enableReinitialize: true,
    validationSchema: profileSchema,
    onSubmit: async (values, helpers) => {
      setSavingProfile(true);
      helpers.setStatus(null);
      try {
        await api.users.updateMe({
          name: values.name,
          email: values.email,
          avatarUrl: values.avatarUrl
        });
        notifications.notify({ title: 'Profile updated', message: 'Changes saved.' });
      } catch (err) {
        const message = err?.message || 'Failed to save profile';
        helpers.setStatus(message);
        notifications.notify({ title: 'Profile save failed', message });
      } finally {
        setSavingProfile(false);
      }
    }
  });

  const passwordFormik = useFormik({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validationSchema: passwordChangeSchema,
    onSubmit: async (values, helpers) => {
      setSavingPassword(true);
      helpers.setStatus(null);
      try {
        await api.users.updateMe({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword
        });
        helpers.resetForm();
        notifications.notify({ title: 'Password updated', message: 'Password changed.' });
      } catch (err) {
        const message = err?.message || 'Failed to update password';
        helpers.setStatus(message);
        notifications.notify({ title: 'Password update failed', message });
      } finally {
        setSavingPassword(false);
      }
    }
  });

  const themeChecked = useMemo(() => theme === 'dark', [theme]);
  const profileSummaryMessages =
    profileFormik.submitCount > 0
      ? flattenValidationErrors(profileFormik.errors).map(t)
      : [];
  const passwordSummaryMessages =
    passwordFormik.submitCount > 0
      ? flattenValidationErrors(passwordFormik.errors).map(t)
      : [];
  const profileFieldError = (name) => {
    const error = getIn(profileFormik.errors, name);
    const touched = getIn(profileFormik.touched, name);
    if (!error) return null;
    if (!touched && profileFormik.submitCount === 0) return null;
    return t(error);
  };
  const passwordFieldError = (name) => {
    const error = getIn(passwordFormik.errors, name);
    const touched = getIn(passwordFormik.touched, name);
    if (!error) return null;
    if (!touched && passwordFormik.submitCount === 0) return null;
    return t(error);
  };

  return (
    <div className="page-section-stack">
      <div className="page-section-header">
        <h1>Settings</h1>
        <p className="Kicker">Update your profile, security, and appearance.</p>
      </div>

      {pageStatus ? <div className="Error">{String(pageStatus)}</div> : null}

      <div className="grid">
        <Card>
          <h3>Profile</h3>
          <form onSubmit={profileFormik.handleSubmit} className="layout-stack-gap-12">
            <FormErrorSummary
              messages={profileSummaryMessages}
              status={profileFormik.status ? String(profileFormik.status) : null}
            />
            <div className="layout-stack-gap-6">
              <label htmlFor="profileName">Name</label>
              <Input
                id="profileName"
                name="name"
                value={profileFormik.values.name}
                onChange={profileFormik.handleChange}
                onBlur={profileFormik.handleBlur}
                placeholder="Your name"
                invalid={Boolean(profileFieldError('name'))}
              />
              {profileFieldError('name') ? (
                <div className="Error">{profileFieldError('name')}</div>
              ) : null}
            </div>
            <div className="layout-stack-gap-6">
              <label htmlFor="profileEmail">Email</label>
              <Input
                id="profileEmail"
                name="email"
                type="email"
                value={profileFormik.values.email}
                onChange={profileFormik.handleChange}
                onBlur={profileFormik.handleBlur}
                placeholder="you@example.com"
                invalid={Boolean(profileFieldError('email'))}
              />
              {profileFieldError('email') ? (
                <div className="Error">{profileFieldError('email')}</div>
              ) : null}
            </div>
            <div className="layout-stack-gap-6">
              <ImageUpload
                label="Profile avatar"
                description="Upload a square avatar image."
                value={profileFormik.values.avatarUrl || ''}
                onChange={(nextUrl) => profileFormik.setFieldValue('avatarUrl', nextUrl)}
                variant="avatar"
                onUpload={({ file, onProgress }) =>
                  api.assets.uploadWithPresign({ file, category: 'images', onProgress })
                }
              />
              {profileFieldError('avatarUrl') ? (
                <div className="Error">{profileFieldError('avatarUrl')}</div>
              ) : null}
            </div>
            <div className="layout-inline-end">
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? (
                  <span className="layout-inline-gap-8 layout-inline-center">
                    <Spinner size="sm" label="Saving profile" />
                    <span>Saving…</span>
                  </span>
                ) : (
                  'Save profile'
                )}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3>Password</h3>
          <form onSubmit={passwordFormik.handleSubmit} className="layout-stack-gap-12">
            <FormErrorSummary
              messages={passwordSummaryMessages}
              status={passwordFormik.status ? String(passwordFormik.status) : null}
            />
            <div className="layout-stack-gap-6">
              <label htmlFor="currentPassword">Current password</label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordFormik.values.currentPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                invalid={Boolean(passwordFieldError('currentPassword'))}
              />
              {passwordFieldError('currentPassword') ? (
                <div className="Error">{passwordFieldError('currentPassword')}</div>
              ) : null}
            </div>
            <div className="layout-stack-gap-6">
              <label htmlFor="newPassword">New password</label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordFormik.values.newPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                invalid={Boolean(passwordFieldError('newPassword'))}
              />
              {passwordFieldError('newPassword') ? (
                <div className="Error">{passwordFieldError('newPassword')}</div>
              ) : null}
            </div>
            <div className="layout-stack-gap-6">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordFormik.values.confirmPassword}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                invalid={Boolean(passwordFieldError('confirmPassword'))}
              />
              {passwordFieldError('confirmPassword') ? (
                <div className="Error">{passwordFieldError('confirmPassword')}</div>
              ) : null}
            </div>
            <div className="layout-inline-end">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? (
                  <span className="layout-inline-gap-8 layout-inline-center">
                    <Spinner size="sm" label="Saving password" />
                    <span>Saving…</span>
                  </span>
                ) : (
                  'Update password'
                )}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3>Appearance</h3>
          <div className="layout-inline-between layout-inline-center">
            <div>
              <div className="text-semibold">Theme</div>
              <div className="Kicker">Switch between dark and light mode.</div>
            </div>
            <Switch.Root
              checked={themeChecked}
              onCheckedChange={async (checked) => {
                const next = checked ? 'dark' : 'light';
                setTheme(next);
                await saveThemePreference(next);
                applyThemePreference(next);
              }}
            >
              <Switch.Thumb />
            </Switch.Root>
          </div>
        </Card>
      </div>
    </div>
  );
}
