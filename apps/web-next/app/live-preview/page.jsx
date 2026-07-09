'use client';

import '@julio/design-tokens/tokens.css';
import '@/app/globals.scss';
import { LiveControl } from '../(app)/engine/components/LiveControl.jsx';
import { MOCK_FOCUS_DEVICES } from '../(app)/engine/components/DuoPlusFocusMode.jsx';

// Dev-only harness (public, no auth) that renders LiveControl in isolation so the
// component + BgsSdk loader can be smoke-tested without the authenticated engine
// console. `requestToken` mirrors the broker response shape; here it reports
// "no session" so the graceful error path is what renders after the SDK loads.
const device = MOCK_FOCUS_DEVICES.find((d) => d.providerDeviceId === 'BzSfu') || MOCK_FOCUS_DEVICES[0];

export default function LivePreviewPage() {
  async function requestToken() {
    return { ok: false, reason: 'no-session', message: 'Preview harness — no brokered session' };
  }
  return (
    <div style={{ padding: 24, maxWidth: 560, marginInline: 'auto' }}>
      <LiveControl device={device} requestToken={requestToken} />
    </div>
  );
}
