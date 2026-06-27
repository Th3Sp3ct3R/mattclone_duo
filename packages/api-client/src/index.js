import axios from 'axios';
import { createTtlCache } from '@julio/cache';

function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  if (!b) return `/${p}`;
  return `${b}/${p}`;
}

let hasWarnedMissingPublicUrl = false;

export function resolveApiBaseUrl() {
  // Web: use same-origin BFF routes.
  if (typeof window !== 'undefined') {
    return '/api';
  }

  // Mobile (Expo): explicit API URL from env.
  if (process?.env?.EXPO_PUBLIC_API_URL) return joinUrl(process.env.EXPO_PUBLIC_API_URL, 'api');

  // Node usage (tests / future services): optional override.
  if (process.env.API_BASE_URL) return joinUrl(process.env.API_BASE_URL, 'api');
  if (process.env.NEXT_PUBLIC_API_URL) return joinUrl(process.env.NEXT_PUBLIC_API_URL, 'api');
  if (!hasWarnedMissingPublicUrl && process.env.NODE_ENV === 'production') {
    hasWarnedMissingPublicUrl = true;
    console.warn('[api-client] Missing API_BASE_URL in production. Falling back to localhost.');
  }

  // Sensible default for local Node usage.
  return 'http://localhost:4000/api';
}

export function normalizeHttpError(err) {
  const status = err?.response?.status ?? null;
  const data = err?.response?.data ?? null;

  const message =
    (data && (data.message || data.error)) ||
    err?.message ||
    'Request failed';

  return {
    ok: false,
    status,
    code: data?.code || err?.code || 'UNKNOWN',
    message,
    details: data?.details || data || null
  };
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

let client = null;
const dashboardCache = createTtlCache({ defaultTtlMs: 30_000 });

const DASHBOARD_SUMMARY_QUERY = `
  query DashboardSummary {
    dashboardSummary {
      meEmail
      counts {
        totalBookings
        upcomingBookings
        totalUsers
        totalServices
        paymentRequiredServices
        totalPosts
        totalAuthors
        totalCategories
      }
      seo {
        defaultLocale
        updatedAt
      }
      series {
        bookingsLast7Days {
          label
          value
        }
        usersLast30Days {
          label
          value
        }
      }
    }
  }
`;

function createClient() {
  const instance = axios.create({
    baseURL: resolveApiBaseUrl(),
    withCredentials: true,
    timeout: 30_000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error?.response?.status;
      if (status === 401 && unauthorizedHandler) {
        try {
          unauthorizedHandler();
        } catch {
          // ignore handler failures
        }
      }
      return Promise.reject(normalizeHttpError(error));
    }
  );

  return instance;
}

export function http() {
  if (!client) client = createClient();
  return client;
}

export const api = {
  auth: {
    async login(payload) {
      const res = await http().post('/v1/auth/login', payload);
      return res.data;
    },
    async logout() {
      const res = await http().post('/v1/auth/logout');
      return res.data;
    },
    async me() {
      const res = await http().get('/v1/auth/me');
      return res.data;
    }
  },
  blog: {
    async getPosts() {
      const res = await http().get('/v1/blog/posts');
      return res.data;
    },
    async getPost(postId) {
      const res = await http().get(`/v1/blog/posts/${postId}`);
      return res.data;
    },
    async createPost(payload) {
      const res = await http().post('/v1/blog/posts', payload);
      return res.data;
    },
    async updatePost(postId, payload) {
      const res = await http().put(`/v1/blog/posts/${postId}`, payload);
      return res.data;
    },
    async getAuthors() {
      const res = await http().get('/v1/blog/authors');
      return res.data;
    },
    async createAuthor(payload) {
      const res = await http().post('/v1/blog/authors', payload);
      return res.data;
    },
    async getCategories() {
      const res = await http().get('/v1/blog/categories');
      return res.data;
    },
    async createCategory(payload) {
      const res = await http().post('/v1/blog/categories', payload);
      return res.data;
    },
    public: {
      async getPosts() {
        const res = await http().get('/v1/blog/public/posts');
        return res.data;
      },
      async getPostBySlug(slug) {
        const res = await http().get(`/v1/blog/public/posts/${slug}`);
        return res.data;
      }
    }
  },
  events: {
    async getEvents() {
      const res = await http().get('/v1/events');
      return res.data;
    },
    async getEvent(eventId) {
      const res = await http().get(`/v1/events/${eventId}`);
      return res.data;
    },
    async createEvent(payload) {
      const res = await http().post('/v1/events', payload);
      return res.data;
    },
    async updateEvent(eventId, payload) {
      const res = await http().put(`/v1/events/${eventId}`, payload);
      return res.data;
    },
    async deleteEvent(eventId) {
      const res = await http().delete(`/v1/events/${eventId}`);
      return res.data;
    },
    public: {
      async getEvents() {
        const res = await http().get('/v1/events/public');
        return res.data;
      },
      async getEventBySlug(slug) {
        const res = await http().get(`/v1/events/public/${slug}`);
        return res.data;
      }
    }
  },
  contact: {
    async createInquiry(payload) {
      const res = await http().post('/v1/contact', payload);
      return res.data;
    },
    async getInquiries() {
      const res = await http().get('/v1/contact');
      return res.data;
    },
    async getInquiry(inquiryId) {
      const res = await http().get(`/v1/contact/${inquiryId}`);
      return res.data;
    },
    async updateInquiry(inquiryId, payload) {
      const res = await http().put(`/v1/contact/${inquiryId}`, payload);
      return res.data;
    }
  },
  seo: {
    async getSettings() {
      const res = await http().get('/v1/seo');
      return res.data;
    },
    public: {
      async getSettings() {
        const res = await http().get('/v1/seo/public');
        return res.data;
      }
    },
    async updateSettings(payload) {
      const res = await http().put('/v1/seo', payload);
      return res.data;
    }
  },
  assets: {
    async createPresignedUpload({ filename, contentType, category = 'assets', size } = {}) {
      const res = await http().post('/v1/assets/presign', {
        filename,
        contentType,
        category,
        size
      });
      return res.data;
    },
    async uploadToS3({ uploadUrl, file, contentType, onProgress } = {}) {
      if (!uploadUrl) throw new Error('Missing upload URL');
      if (typeof onProgress === 'function' && typeof XMLHttpRequest !== 'undefined') {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl);
          if (contentType) xhr.setRequestHeader('Content-Type', contentType);
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              onProgress(100);
              resolve(true);
              return;
            }
            reject(new Error('Upload failed'));
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(file);
        });
      }
      const headers = contentType ? { 'Content-Type': contentType } : undefined;
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: file
      });
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      if (typeof onProgress === 'function') onProgress(100);
      return true;
    },
    async uploadWithPresign({ file, category = 'assets', onProgress } = {}) {
      if (!file) throw new Error('Missing file');
      const contentType = file.type || 'application/octet-stream';
      const presign = await api.assets.createPresignedUpload({
        filename: file.name,
        contentType,
        category,
        size: file.size
      });
      await api.assets.uploadToS3({
        uploadUrl: presign.uploadUrl,
        file,
        contentType,
        onProgress
      });
      return presign.publicUrl || '';
    },
    async uploadImage(file) {
      const form = new FormData();
      form.append('file', file);
      const res = await http().post('/v1/assets/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    }
  },
  users: {
    async getUsers() {
      const res = await http().get('/v1/users');
      return res.data;
    },
    async getMe() {
      const res = await http().get('/v1/users/me');
      return res.data;
    },
    async getUser(userId) {
      const res = await http().get(`/v1/users/${userId}`);
      return res.data;
    },
    async createUser(payload) {
      const res = await http().post('/v1/users', payload);
      return res.data;
    },
    async updateMe(payload) {
      const res = await http().put('/v1/users/me', payload);
      return res.data;
    },
    async updateUser(userId, payload) {
      const res = await http().put(`/v1/users/${userId}`, payload);
      return res.data;
    },
    async deleteUser(userId) {
      const res = await http().delete(`/v1/users/${userId}`);
      return res.data;
    }
  },
  booking: {
    async getServices({ slug } = {}) {
      const query = slug ? `?slug=${encodeURIComponent(slug)}` : '';
      const res = await http().get(`/v1/booking/services${query}`);
      return res.data;
    },
    async getAvailability(params = {}) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, value);
        }
      });
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const res = await http().get(`/v1/booking/availability${suffix}`);
      return res.data;
    },
    async createBooking(payload) {
      const res = await http().post('/v1/booking', payload);
      return res.data;
    }
  },
  admin: {
    async getBookingServices() {
      const res = await http().get('/v1/admin/booking-services');
      return res.data;
    },
    async createBookingService(payload) {
      const res = await http().post('/v1/admin/booking-services', payload);
      return res.data;
    },
    async getBookingService(serviceId) {
      const res = await http().get(`/v1/admin/booking-services/${serviceId}`);
      return res.data;
    },
    async updateBookingService(serviceId, payload) {
      const res = await http().put(`/v1/admin/booking-services/${serviceId}`, payload);
      return res.data;
    },
    async deleteBookingService(serviceId) {
      const res = await http().delete(`/v1/admin/booking-services/${serviceId}`);
      return res.data;
    },
    async getBookingAvailability(serviceId) {
      const res = await http().get(`/v1/admin/booking-availability?serviceId=${serviceId}`);
      return res.data;
    },
    async updateBookingAvailability(payload) {
      const res = await http().put('/v1/admin/booking-availability', payload);
      return res.data;
    },
    async getBookings(params = {}) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, value);
        }
      });
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const res = await http().get(`/v1/admin/bookings${suffix}`);
      return res.data;
    },
    async getBooking(bookingId) {
      const res = await http().get(`/v1/admin/bookings/${bookingId}`);
      return res.data;
    },
    async updateBooking(bookingId, payload) {
      const res = await http().put(`/v1/admin/bookings/${bookingId}`, payload);
      return res.data;
    },
    async deleteBooking(bookingId) {
      const res = await http().delete(`/v1/admin/bookings/${bookingId}`);
      return res.data;
    },
    async getDashboardSummary({ cacheKey = 'dashboardSummary' } = {}) {
      const cached = dashboardCache.get(cacheKey);
      if (cached) return cached;
      const res = await http().post('/v1/admin/dashboard/graphql', { query: DASHBOARD_SUMMARY_QUERY });
      const payload = res.data;
      if (!payload?.data?.dashboardSummary || payload?.errors) {
        throw new Error(payload?.message || 'Failed to load dashboard data.');
      }
      const summary = payload.data.dashboardSummary;
      dashboardCache.set(cacheKey, summary);
      return summary;
    }
  },
  payments: {
    async createCheckoutSession(payload) {
      const res = await http().post('/v1/payments/checkout/session', payload);
      return res.data;
    },
    async createPaymentIntent(payload) {
      const res = await http().post('/v1/payments/payment-intent', payload);
      return res.data;
    },
    async createSubscription(payload) {
      const res = await http().post('/v1/payments/subscription', payload);
      return res.data;
    }
  },
  chat: {
    async sendMessage(payload) {
      const res = await http().post('/v1/chat', payload);
      return res.data;
    }
  },
  engine: {
    async getFleetSummary() {
      const res = await http().get('/v1/engine/fleet');
      return res.data;
    },
    async getJobRuns(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await http().get(`/v1/engine/job-runs${query ? `?${query}` : ''}`);
      return res.data;
    },
    async getDevices() {
      const res = await http().get('/v1/engine/devices');
      return res.data;
    },
    async createDevice(payload) {
      const res = await http().post('/v1/engine/devices', payload);
      return res.data;
    },
    async syncDevices(provider = 'vmos') {
      const res = await http().post('/v1/engine/devices/sync', { provider });
      return res.data;
    },
    async enqueueDeviceAction(deviceId, action) {
      const res = await http().post(`/v1/engine/devices/${deviceId}/actions/${action}`);
      return res.data;
    },
    async getDeviceStatus(deviceId) {
      const res = await http().get(`/v1/engine/devices/${deviceId}/status`);
      return res.data;
    },
    async getDeviceFocus(deviceId, quality = {}) {
      const query = new URLSearchParams(
        Object.entries(quality).filter(([, value]) => value !== undefined && value !== null && value !== '')
      ).toString();
      const res = await http().get(`/v1/engine/devices/${deviceId}/focus${query ? `?${query}` : ''}`);
      return res.data;
    },
    async initDuoPlusProxy(deviceId, payload) {
      const res = await http().post(`/v1/engine/devices/${deviceId}/proxy/init`, payload);
      return res.data;
    },
    async getDuoPlusFrames(ids = []) {
      const query = ids.length ? `?ids=${encodeURIComponent(ids.join(','))}` : '';
      const res = await http().get(`/v1/engine/duoplus/frames${query}`);
      return res.data;
    },
    async getDeviceEvents(deviceId, params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await http().get(`/v1/engine/devices/${deviceId}/events${query ? `?${query}` : ''}`);
      return res.data;
    },
    deviceEventsStreamUrl(deviceId, params = {}) {
      const query = new URLSearchParams(params).toString();
      return `${resolveApiBaseUrl()}/v1/engine/devices/${deviceId}/events/stream${query ? `?${query}` : ''}`;
    },
    async getAccounts(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await http().get(`/v1/engine/accounts${query ? `?${query}` : ''}`);
      return res.data;
    },
    async createAccount(payload) {
      const res = await http().post('/v1/engine/accounts', payload);
      return res.data;
    },
    async assignDevice(accountId, deviceId) {
      const res = await http().post(`/v1/engine/accounts/${accountId}/assign-device`, { deviceId });
      return res.data;
    },
    async unassignDevice(accountId) {
      const res = await http().post(`/v1/engine/accounts/${accountId}/unassign-device`);
      return res.data;
    },
    async enqueueAccountAction(accountId, action) {
      const res = await http().post(`/v1/engine/accounts/${accountId}/actions/${action}`);
      return res.data;
    },
    async enqueueAccountOnboarding(accountId, payload = {}) {
      const res = await http().post(`/v1/engine/accounts/${accountId}/onboard`, payload);
      return res.data;
    },
    async getPosts(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await http().get(`/v1/engine/posts${query ? `?${query}` : ''}`);
      return res.data;
    },
    async createPost(payload) {
      const res = await http().post('/v1/engine/posts', payload);
      return res.data;
    },
    async enqueuePostAction(postId, action) {
      const res = await http().post(`/v1/engine/posts/${postId}/actions/${action}`);
      return res.data;
    },
    async getProxies() {
      const res = await http().get('/v1/engine/proxies');
      return res.data;
    },
    async verifyProxy(proxyId) {
      const res = await http().post(`/v1/engine/proxies/${proxyId}/verify`);
      return res.data;
    },
    async enqueueProxyMonitor() {
      const res = await http().post('/v1/engine/proxies/monitor');
      return res.data;
    },
    async getNiches() {
      const res = await http().get('/v1/engine/niches');
      return res.data;
    },
    async getContentPool(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await http().get(`/v1/engine/content-pool${query ? `?${query}` : ''}`);
      return res.data;
    },
    async updateContentPoolItem(itemId, payload) {
      const res = await http().put(`/v1/engine/content-pool/${itemId}`, payload);
      return res.data;
    },
    async downloadContentPoolItem(itemId) {
      const res = await http().post(`/v1/engine/content-pool/${itemId}/download`);
      return res.data;
    },
    async getSourceMedia() {
      const res = await http().get('/v1/engine/pipeline/source-media');
      return res.data;
    },
    async getTranscripts() {
      const res = await http().get('/v1/engine/pipeline/transcripts');
      return res.data;
    },
    async getClips() {
      const res = await http().get('/v1/engine/pipeline/clips');
      return res.data;
    },
    async getTransforms() {
      const res = await http().get('/v1/engine/transforms');
      return res.data;
    },
    async getSocialProfiles() {
      const res = await http().get('/v1/engine/social/profiles');
      return res.data;
    },
    async getSocialPosts() {
      const res = await http().get('/v1/engine/social/posts');
      return res.data;
    },
    async getSocialScores() {
      const res = await http().get('/v1/engine/social/scores');
      return res.data;
    },
    async enqueueSocialScrape(payload) {
      const res = await http().post('/v1/engine/social/scrape', payload);
      return res.data;
    },
    async getTrends() {
      const res = await http().get('/v1/engine/trends');
      return res.data;
    },
    async enqueueTrend(payload) {
      const res = await http().post('/v1/engine/trends', payload);
      return res.data;
    },
    async getTrendMatches() {
      const res = await http().get('/v1/engine/trend-matches');
      return res.data;
    },
    async getExpenses() {
      const res = await http().get('/v1/engine/expenses');
      return res.data;
    },
    async getDjekxaBalance() {
      const res = await http().get('/v1/engine/djekxa/balance');
      return res.data;
    },
    async getDjekxaProducts(params = {}) {
      const query = new URLSearchParams(params).toString();
      const res = await http().get(`/v1/engine/djekxa/products${query ? `?${query}` : ''}`);
      return res.data;
    },
    async getDjekxaOrders() {
      const res = await http().get('/v1/engine/djekxa/orders');
      return res.data;
    },
    async enqueueDjekxaImport(payload = {}) {
      const res = await http().post('/v1/engine/djekxa/import', payload);
      return res.data;
    },
    async enqueueDjekxaOrder(payload) {
      const res = await http().post('/v1/engine/djekxa/orders', payload);
      return res.data;
    }
  }
};
