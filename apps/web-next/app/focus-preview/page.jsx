'use client';

import '@julio/design-tokens/tokens.css';
import '@/app/globals.scss';
import { DuoPlusFocusMode, MOCK_FOCUS_DEVICES } from '../(app)/engine/components/DuoPlusFocusMode.jsx';

export default function FocusPreviewPage() {
  return (
    <html data-theme="dark">
      <body style={{ margin: 0, padding: 24, background: 'var(--ui-bg)', color: 'var(--ui-fg)' }}>
        <DuoPlusFocusMode
          devices={MOCK_FOCUS_DEVICES}
          onFocus={() => {}}
          onRefreshStatus={() => {}}
          onCapture={() => {}}
          actionKey=""
        />
      </body>
    </html>
  );
}
