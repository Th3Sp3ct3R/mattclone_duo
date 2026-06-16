import { createNotifications } from '@julio/notifications';
import { createWebNotifications } from '@julio/notifications/web';

export const notifications = createNotifications(createWebNotifications());
