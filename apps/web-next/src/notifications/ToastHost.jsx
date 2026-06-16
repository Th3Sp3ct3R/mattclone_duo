'use client';

import { useEffect } from 'react';

import { Toast } from '@julio/ui';
import { NOTIFICATION_EVENT } from '@julio/notifications/web';

function ToastNotifications({ duration }) {
  const { toasts, add } = Toast.useToastManager();

  useEffect(() => {
    const onNotify = (event) => {
      const payload = event?.detail;
      add({
        title: payload?.title || 'Update',
        message: payload?.message || '',
        timeout: duration
      });
    };
    window.addEventListener(NOTIFICATION_EVENT, onNotify);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onNotify);
  }, [add, duration]);

  return (
    <>
      <Toast.Viewport />
      {toasts.map((toast) => (
        <Toast.Root key={toast.id} toast={toast}>
          <Toast.Title>{toast.title || 'Update'}</Toast.Title>
          {toast.message ? <Toast.Description>{toast.message}</Toast.Description> : null}
          <Toast.Close>Close</Toast.Close>
        </Toast.Root>
      ))}
    </>
  );
}

export function ToastHost() {
  const duration = 4000;

  return (
    <Toast.Provider swipeDirection="right">
      <ToastNotifications duration={duration} />
    </Toast.Provider>
  );
}
