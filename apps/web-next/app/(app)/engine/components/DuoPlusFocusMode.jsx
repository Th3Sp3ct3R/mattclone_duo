'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@julio/ui';

const POLL_INTERVAL_MS = 7000;

// Mock fleet used when no real DuoPlus devices are wired yet (demo mode).
// Mirrors the nine cloud phones visible in the live DuoPlus desktop app.
export const MOCK_FOCUS_DEVICES = [
  mockDevice('FpPU2', 'running', 'us-east', { proxyIp: '104.28.210.11', activeAccounts: 2, maxAccounts: 3, adb: '127.0.0.1:5610', app: 'tiktok' }),
  mockDevice('Qg7jG', 'running', 'us-east', { proxyIp: '188.42.19.88', activeAccounts: 1, maxAccounts: 3, adb: '127.0.0.1:5611', app: 'instagram' }),
  mockDevice('kZfN4', 'running', 'eu-west', { proxyIp: '45.131.7.204', activeAccounts: 3, maxAccounts: 4, adb: '127.0.0.1:5612', app: 'home' }),
  mockDevice('BzSfu', 'running', 'eu-west', { proxyIp: '91.219.236.5', activeAccounts: 1, maxAccounts: 3, adb: '127.0.0.1:5613', app: 'tiktok' }),
  mockDevice('TAdoD', 'running', 'us-east', { proxyIp: '173.245.59.42', activeAccounts: 2, maxAccounts: 3, adb: '127.0.0.1:5614', app: 'instagram' }),
  mockDevice('SxarH', 'running', 'ap-south', { proxyIp: '103.21.244.17', activeAccounts: 0, maxAccounts: 3, adb: '127.0.0.1:5615', app: 'home' }),
  mockDevice('N5jrb', 'starting', 'us-east', { proxyIp: '', activeAccounts: 0, maxAccounts: 3, adb: '', app: 'boot' }),
  mockDevice('1aMl4', 'stopped', 'eu-west', { proxyIp: '', activeAccounts: 0, maxAccounts: 3, adb: '', app: 'off' }),
  mockDevice('qXFA1', 'stopped', 'ap-south', { proxyIp: '', activeAccounts: 0, maxAccounts: 3, adb: '', app: 'off' })
];

function mockDevice(id, status, region, meta) {
  return {
    _id: `mock-${id}`,
    provider: 'duoplus',
    providerDeviceId: id,
    name: id,
    status,
    region,
    runtime: { adbAddress: meta.adb, screenWidth: 720, screenHeight: 1280, lastScreenshotUrl: '' },
    capacity: { maxAccounts: meta.maxAccounts, activeAccountCount: meta.activeAccounts },
    providerMeta: {
      proxyConfigured: Boolean(meta.proxyIp),
      proxyIp: meta.proxyIp,
      ip: meta.proxyIp
    },
    __mockApp: meta.app
  };
}

const STATUS_TONE = {
  running: 'ok',
  starting: 'working',
  stopping: 'working',
  stopped: 'idle',
  error: 'failed',
  unknown: 'idle'
};

function deviceName(device) {
  if (device?.provider === 'duoplus' && device.providerDeviceId && device.name === `snap_${device.providerDeviceId}`) {
    return device.providerDeviceId;
  }
  return device?.name || device?.providerDeviceId || String(device?._id || 'device');
}

function proxyLabel(device) {
  const configured = Boolean(device.providerMeta?.proxyConfigured);
  if (!configured) return 'No proxy';
  return device.providerMeta?.proxyIp || device.providerMeta?.ip || 'configured';
}

function idOf(value) {
  return value?._id ? String(value._id) : value ? String(value) : '';
}

function checkpointLabel(reason = '') {
  return String(reason || '')
    .split('_')
    .filter(Boolean)
    .join(' ');
}

// Build the tiles. Prefer real DuoPlus devices; fall back to mock fleet for the demo.
function buildFocusTiles(devices, accounts = []) {
  const real = (devices || []).filter((d) => d.provider === 'duoplus' && !d.retiredAt);
  const source = real.length ? real : MOCK_FOCUS_DEVICES;
  return source.map((device) => {
    const status = device.status || 'unknown';
    const checkpointed = (accounts || []).filter(
      (account) => account.status === 'checkpointed' && idOf(account.assignedDeviceId) === idOf(device._id)
    );
    const checkpointReason = checkpointed.map((account) => checkpointLabel(account.checkpointReason)).find(Boolean);
    return {
      device,
      id: String(device._id),
      name: deviceName(device),
      providerDeviceId: device.providerDeviceId || '',
      status,
      tone: STATUS_TONE[status] || 'idle',
      region: device.region || '—',
      proxyLabel: proxyLabel(device),
      proxyOk: Boolean(device.providerMeta?.proxyConfigured),
      activeAccounts: device.capacity?.activeAccountCount ?? 0,
      maxAccounts: device.capacity?.maxAccounts ?? 0,
      adbAddress: device.runtime?.adbAddress || '',
      screenshotUrl: device.runtime?.lastScreenshotUrl || '',
      mockApp: device.__mockApp || '',
      checkpointReason,
      checkpointCount: checkpointed.length,
      isMock: !real.length
    };
  });
}

export function DuoPlusFocusMode({ devices, accounts, onFocus, onRefreshStatus, onCapture, onPoll, fetchFrames, actionKey }) {
  const [runningOnly, setRunningOnly] = useState(true);
  const [live, setLive] = useState(true);
  const [frames, setFrames] = useState({}); // providerDeviceId -> data URL (from batchCapture2)
  const [frameSource, setFrameSource] = useState(''); // 'live' | 'no-session' | 'expired'
  const tiles = useMemo(() => buildFocusTiles(devices, accounts), [devices, accounts]);
  const runningCount = tiles.filter((tile) => tile.status === 'running').length;
  const demoMode = tiles.some((tile) => tile.isMock);
  const visible = runningOnly ? tiles.filter((tile) => tile.status === 'running') : tiles;
  const captureTargets = tiles.filter((tile) => tile.status === 'running' && !tile.isMock);

  async function captureAll() {
    if (!onCapture) return;
    for (const tile of captureTargets) {
      // sequential to respect the DuoPlus API rate limiter
      await onCapture(tile.device);
    }
  }

  // Near-live refresh: while focus mode is open + tab visible, pull live frames for
  // all running phones in ONE batchCapture2 call (cheap), and re-poll device status.
  // Paused when hidden or toggled off. Falls back to stored ADB screenshots when no
  // captured DuoPlus session is available.
  const pollState = useRef({ onPoll, fetchFrames, hasTargets: false });
  pollState.current.onPoll = onPoll;
  pollState.current.fetchFrames = fetchFrames;
  pollState.current.hasTargets = captureTargets.length > 0;

  useEffect(() => {
    if (!live) return undefined;
    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const s = pollState.current;
      if (!s.hasTargets) return; // nothing real+running to refresh
      s.onPoll?.();
      if (s.fetchFrames) {
        try {
          const res = await s.fetchFrames();
          if (res?.ok && Array.isArray(res.frames)) {
            const map = {};
            for (const f of res.frames) if (f.dataUrl) map[f.imageId] = f.dataUrl;
            setFrames(map);
            setFrameSource('live');
          } else if (res && res.ok === false) {
            setFrameSource(res.reason || 'unavailable');
          }
        } catch {
          /* keep last frames; status still refreshes via onPoll */
        }
      }
    };
    tick(); // immediate, don't wait a full interval
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [live]);

  return (
    <div className="FocusMode" aria-label="DuoPlus focus mode wall">
      <div className="FocusMode__bar">
        <div className="FocusMode__title">
          <div className="Kicker">Focus mode</div>
          <h3>Cloud phone wall</h3>
        </div>
        <div className="FocusMode__meta">
          <span className="FocusMode__count">
            <span className="FocusMode__dot FocusMode__dot--ok" />
            {runningCount} running
          </span>
          <span className="Kicker">{tiles.length} total</span>
          {demoMode ? <span className="FocusMode__demo">demo data</span> : null}
          {frameSource === 'live' ? <span className="FocusModeBadge FocusModeBadge--live">batchCapture2</span> : null}
          {frameSource === 'no-session' || frameSource === 'expired' ? (
            <span className="FocusMode__demo" title="Run: yarn workspace @julio/api capture:session --preset duoplus">
              {frameSource === 'expired' ? 'session expired' : 'no session · ADB fallback'}
            </span>
          ) : null}
          {onPoll && captureTargets.length ? (
            <Button
              size="sm"
              variant={live ? 'primary' : 'secondary'}
              aria-pressed={live}
              onClick={() => setLive((prev) => !prev)}
            >
              {live ? '● Live' : 'Paused'}
            </Button>
          ) : null}
          {onCapture && captureTargets.length ? (
            <Button size="sm" variant="secondary" onClick={captureAll}>
              Capture frames ({captureTargets.length})
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={runningOnly ? 'primary' : 'secondary'}
            onClick={() => setRunningOnly((prev) => !prev)}
          >
            {runningOnly ? 'Running only' : 'Show all'}
          </Button>
        </div>
      </div>

      {visible.length ? (
        <div className="FocusGrid">
          {visible.map((tile) => (
            <FocusPhone
              key={tile.id}
              tile={tile}
              liveFrame={frames[tile.providerDeviceId] || ''}
              actionKey={actionKey}
              onFocus={onFocus}
              onRefreshStatus={onRefreshStatus}
              onCapture={onCapture}
            />
          ))}
        </div>
      ) : (
        <div className="FocusMode__empty">No running cloud phones. Toggle “Show all” to see parked devices.</div>
      )}
    </div>
  );
}

function FocusPhone({ tile, liveFrame, actionKey, onFocus, onRefreshStatus, onCapture }) {
  const statusBusy = actionKey === `device:${tile.id}:status`;
  const captureBusy = actionKey === `device:${tile.id}:screenshot`;
  const canCapture = Boolean(onCapture) && tile.status === 'running' && !tile.isMock;
  // Live batchCapture2 frame wins; otherwise the last stored ADB screenshot; else mock.
  const imgSrc = liveFrame || tile.screenshotUrl;
  return (
    <div className={`FocusPhone FocusPhone--${tile.tone}`}>
      <div className="FocusPhone__frame">
        <div className="FocusPhone__notch" />
        <div className="FocusPhone__screen">
          {imgSrc ? (
            <img src={imgSrc} alt={`${tile.name} screen`} />
          ) : (
            <MockScreen tile={tile} />
          )}
          <div className="FocusPhone__overlay">
            <span className={`FocusPhone__status FocusPhone__status--${tile.tone}`}>
              <span className="FocusMode__dot" />
              {tile.status}
            </span>
          </div>
        </div>
      </div>

      <div className="FocusPhone__info">
        <div className="FocusPhone__head">
          <strong>{tile.name}</strong>
          <span className="Kicker">{tile.region}</span>
        </div>
        <div className="FocusPhone__stats">
          <span className={`FocusChip ${tile.proxyOk ? 'FocusChip--ok' : 'FocusChip--missing'}`}>{tile.proxyLabel}</span>
          <span className="FocusChip">
            {tile.activeAccounts}/{tile.maxAccounts} acct
          </span>
          {tile.checkpointCount ? (
            <span className="FocusChip FocusChip--missing">
              {tile.checkpointReason || 'manual intervention'}
            </span>
          ) : null}
        </div>
        <div className="FocusPhone__actions">
          <Button
            size="sm"
            variant="secondary"
            loading={statusBusy}
            disabled={!onRefreshStatus}
            onClick={() => onRefreshStatus?.(tile.device)}
          >
            status
          </Button>
          {canCapture ? (
            <Button size="sm" variant="secondary" loading={captureBusy} onClick={() => onCapture?.(tile.device)}>
              frame
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" disabled={!onFocus} onClick={() => onFocus?.(tile.device)}>
            focus
          </Button>
        </div>
      </div>
    </div>
  );
}

// Lightweight simulated phone screen for demo tiles with no real screenshot.
function MockScreen({ tile }) {
  if (tile.status !== 'running') {
    return (
      <div className={`MockScreen MockScreen--${tile.tone}`}>
        <span className="MockScreen__glyph">{tile.status === 'starting' ? '⟳' : '⏻'}</span>
        <small>{tile.status === 'starting' ? 'booting…' : 'powered off'}</small>
      </div>
    );
  }
  const app = tile.mockApp || 'home';
  return (
    <div className={`MockScreen MockScreen--app MockScreen--${app}`}>
      <div className="MockScreen__statusbar">
        <span>{tile.providerDeviceId}</span>
        <span>●●●</span>
      </div>
      <div className="MockScreen__app">
        <span className="MockScreen__appName">{app}</span>
      </div>
      <div className="MockScreen__nav">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
