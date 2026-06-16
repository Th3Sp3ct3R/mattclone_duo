export class IntegrationHttpClient {
  constructor({ baseUrl = '', headers = {}, fetchImpl = globalThis.fetch } = {}) {
    if (!fetchImpl) throw new Error('fetch implementation is required');
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.headers = headers;
    this.fetchImpl = fetchImpl;
  }

  buildUrl(path) {
    const suffix = String(path || '').replace(/^\/+/, '');
    return this.baseUrl ? `${this.baseUrl}/${suffix}` : `/${suffix}`;
  }

  async request(path, { method = 'GET', body = null, headers = {} } = {}) {
    const response = await this.fetchImpl(this.buildUrl(path), {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...this.headers,
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = new Error(data?.message || 'Integration request failed');
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  }
}
