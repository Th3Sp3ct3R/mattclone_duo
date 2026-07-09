import * as whatsapp from './index.js';

describe('@julio/whatsapp public surface', () => {
  it('re-exports domain building blocks', () => {
    expect(typeof whatsapp.createMsisdn).toBe('function');
    expect(typeof whatsapp.reconcile).toBe('function');
    expect(typeof whatsapp.expandReportTasks).toBe('function');
    expect(Array.isArray(whatsapp.ACCOUNT_STATUSES)).toBe(true);
    expect(Array.isArray(whatsapp.PORTS)).toBe(true);
  });
});
