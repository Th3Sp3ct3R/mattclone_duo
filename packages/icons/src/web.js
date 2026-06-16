import {
  mdiAccount,
  mdiAlert,
  mdiAlertCircle,
  mdiAccountGroupOutline,
  mdiArrowLeft,
  mdiArrowRight,
  mdiCalendar,
  mdiChartLine,
  mdiCheck,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChatOutline,
  mdiClose,
  mdiCog,
  mdiCreditCardOutline,
  mdiEmail,
  mdiFileDocumentOutline,
  mdiHome,
  mdiInformation,
  mdiLock,
  mdiLogout,
  mdiSend,
  mdiMagnify,
  mdiMenu,
  mdiMinus,
  mdiPlus,
  mdiTagOutline,
  mdiViewDashboard
} from '@mdi/js';

const iconPathMap = {
  add: mdiPlus,
  remove: mdiMinus,
  close: mdiClose,
  check: mdiCheck,
  chevronLeft: mdiChevronLeft,
  chevronRight: mdiChevronRight,
  arrowLeft: mdiArrowLeft,
  arrowRight: mdiArrowRight,
  search: mdiMagnify,
  settings: mdiCog,
  user: mdiAccount,
  users: mdiAccountGroupOutline,
  home: mdiHome,
  dashboard: mdiViewDashboard,
  menu: mdiMenu,
  blog: mdiFileDocumentOutline,
  posts: mdiFileDocumentOutline,
  categories: mdiTagOutline,
  authors: mdiAccount,
  calendar: mdiCalendar,
  bookings: mdiCalendar,
  lock: mdiLock,
  email: mdiEmail,
  alert: mdiAlertCircle,
  info: mdiInformation,
  analytics: mdiChartLine,
  payments: mdiCreditCardOutline,
  seo: mdiMagnify,
  warning: mdiAlert,
  chat: mdiChatOutline,
  logout: mdiLogout,
  send: mdiSend
};

export const iconNames = Object.keys(iconPathMap);

export function Icon({ name, size = 20, color = 'currentColor', className = '', title = '' } = {}) {
  const path = iconPathMap[name];
  if (!path) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.warn(`[icons] Unknown icon name: ${String(name)}`);
    }
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <path fill={color} d={path} />
    </svg>
  );
}

