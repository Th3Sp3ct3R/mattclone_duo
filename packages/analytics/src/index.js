const DEFAULT_CONTEXT = {
  platform: 'unknown',
  source: 'app'
};

export function createAnalytics({ adapter = null, context = {} } = {}) {
  const baseContext = { ...DEFAULT_CONTEXT, ...context };

  function track(eventName, properties = {}) {
    const payload = {
      name: eventName,
      properties,
      context: baseContext,
      timestamp: Date.now()
    };

    if (adapter && typeof adapter.track === 'function') {
      adapter.track(payload);
    }
    return payload;
  }

  return { track };
}

export function createAdapter(handler) {
  return {
    track(payload) {
      handler(payload);
    }
  };
}

export const AnalyticsEvents = {
  PageViewed: 'page_viewed',
  LoginSucceeded: 'login_succeeded',
  LoginFailed: 'login_failed',
  Logout: 'logout',
  BookingSubmitted: 'booking_submitted',
  DashboardViewed: 'dashboard_viewed'
};

export function trackEvent(analytics, eventName, properties = {}) {
  if (!analytics || typeof analytics.track !== 'function') return null;
  return analytics.track(eventName, properties);
}

