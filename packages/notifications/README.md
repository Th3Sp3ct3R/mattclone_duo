# @julio/notifications

Shared notification abstraction with platform adapters.

## Usage
```js
import { createNotifications } from '@julio/notifications';
import { createWebNotifications } from '@julio/notifications/web';

const notifications = createNotifications(createWebNotifications());
notifications.notify({ title: 'Saved', message: 'Profile updated' });
```

