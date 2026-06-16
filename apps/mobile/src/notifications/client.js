import { Alert } from 'react-native';
import { createNotifications } from '@julio/notifications';
import { createNativeNotifications } from '@julio/notifications/native';

const nativeAdapter = createNativeNotifications({
  notify({ title, message }) {
    const resolvedTitle = title || 'Notice';
    const resolvedMessage = message || 'Something went wrong.';
    Alert.alert(resolvedTitle, resolvedMessage);
  }
});

export const notifications = createNotifications(nativeAdapter);
