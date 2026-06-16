import { MaterialIcons } from '@expo/vector-icons';

const materialIconMap = {
  add: 'add',
  remove: 'remove',
  close: 'close',
  check: 'check',
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  arrowLeft: 'arrow-back',
  arrowRight: 'arrow-forward',
  search: 'search',
  settings: 'settings',
  user: 'person',
  users: 'group',
  home: 'home',
  dashboard: 'dashboard',
  menu: 'menu',
  blog: 'article',
  posts: 'article',
  categories: 'label',
  authors: 'person',
  calendar: 'calendar-today',
  bookings: 'calendar-today',
  lock: 'lock',
  email: 'email',
  alert: 'error-outline',
  info: 'info',
  analytics: 'insights',
  payments: 'payment',
  seo: 'search',
  warning: 'warning',
  logout: 'logout',
  send: 'send'
};

export const iconNames = Object.keys(materialIconMap);

export function Icon({ name, size = 20, color = '#0a0a0a', accessibilityLabel } = {}) {
  const resolvedName = materialIconMap[name];
  if (!resolvedName) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.warn(`[icons] Unknown icon name: ${String(name)}`);
    }
    return null;
  }

  return (
    <MaterialIcons
      name={resolvedName}
      size={size}
      color={color}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

