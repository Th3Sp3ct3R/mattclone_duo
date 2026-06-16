export const NOTIFICATION_EVENT = 'julio:notification';

export function createWebNotifications() {
  return {
    notify({ title, message }) {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(
        new CustomEvent(NOTIFICATION_EVENT, {
          detail: { title, message }
        })
      );
    }
  };
}

