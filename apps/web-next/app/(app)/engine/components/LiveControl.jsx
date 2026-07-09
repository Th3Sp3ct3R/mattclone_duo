'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@julio/ui';

// Path C live control: drives the RedFinger `BgsSdk` web SDK (self-hosted from
// /public) using a serverToken brokered by the API. The server runs the ARMVM
// handshake (startCheck -> start -> connect -> connectTokenShared) and returns
// { appId, serverToken, padCode, onlineTime, quality }; this component only
// initialises the SDK, binds the video to a view element, and forwards input.
// See docs/duoplus-endpoints-captured.md §3b for the full chain.

const SDK_DEFAULT_URL = '/BgsSdk.min.1.54.0.dp.js';
const HEARTBEAT_MS = 20_000;

const PHASE = {
  idle: 'idle',
  connecting: 'connecting',
  streaming: 'streaming',
  stopped: 'stopped',
  error: 'error'
};

// Module-level cache so the ~1.1 MB SDK is fetched at most once per page load.
let sdkLoadPromise = null;

function loadBgsSdk(url = SDK_DEFAULT_URL) {
  if (typeof window === 'undefined') return Promise.reject(new Error('BgsSdk requires a browser'));
  if (window.BgsSdk) return Promise.resolve(window.BgsSdk);
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.bgsSdk = '1';
    script.onload = () =>
      window.BgsSdk ? resolve(window.BgsSdk) : reject(new Error('BgsSdk global missing after load'));
    script.onerror = () => {
      sdkLoadPromise = null; // allow a retry
      reject(new Error('Failed to load BgsSdk bundle'));
    };
    document.body.appendChild(script);
  });
  return sdkLoadPromise;
}

function reasonMessage(token) {
  if (token?.reason === 'no-session') return 'No DuoPlus session captured — re-login the refresh browser.';
  if (token?.reason === 'expired') return 'DuoPlus session expired — re-capture it.';
  if (token?.reason === 'incomplete-handshake') return 'ARMVM returned no serverToken — try again.';
  return token?.message || 'Live control unavailable';
}

/**
 * @param {object}   props
 * @param {object}   props.device        engine device ({ _id, providerDeviceId, name, runtime })
 * @param {Function} props.requestToken  async (uuid) => broker payload from api.engine.connectLiveControl
 * @param {Function} [props.sendHeartbeat] async (type) => void (api.engine.liveHeartbeat)
 * @param {Function} [props.onClose]
 */
export function LiveControl({ device, requestToken, sendHeartbeat, onClose }) {
  const imageId = device?.providerDeviceId || '';
  const viewId = `bgs-view-${imageId || device?._id || 'device'}`;
  const [phase, setPhase] = useState(PHASE.idle);
  const [message, setMessage] = useState('');
  const [text, setText] = useState('');
  const heartbeatRef = useRef(null);
  const activeRef = useRef(false);
  const rotationRef = useRef(0);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    stopHeartbeat();
    activeRef.current = false;
    try {
      window.BgsSdk?.stopPhone?.();
    } catch {
      /* SDK may not be initialised yet */
    }
  }, [stopHeartbeat]);

  const connect = useCallback(async () => {
    if (!requestToken || !imageId) {
      setPhase(PHASE.error);
      setMessage('Missing device id or token fetcher');
      return;
    }
    setPhase(PHASE.connecting);
    setMessage('Loading SDK…');
    const uuid = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let sdk;
    try {
      sdk = await loadBgsSdk();
    } catch (err) {
      setPhase(PHASE.error);
      setMessage(err.message);
      return;
    }

    setMessage('Requesting session…');
    let token;
    try {
      token = await requestToken(uuid);
    } catch (err) {
      setPhase(PHASE.error);
      setMessage(err?.message || 'Token request failed');
      return;
    }
    if (!token || token.ok === false) {
      setPhase(PHASE.error);
      setMessage(reasonMessage(token));
      return;
    }

    const quality = token.quality || {};
    activeRef.current = true;
    setMessage('Connecting stream…');
    try {
      sdk.initPhone({
        appId: token.appId,
        onlineTime: token.onlineTime,
        viewId,
        instanceCode: token.padCode,
        width: Number(quality.width) || 720,
        height: Number(quality.height) || 1280,
        bitrate: Number(quality.bitrate) || 2000,
        fps: Number(quality.fps) || 24,
        isWebRtc: true,
        packageName: '',
        ...(token.connectPhoneUrl ? { connectPhoneUrl: token.connectPhoneUrl } : {}),
        callbacks: {
          onInitSuccess: () => {
            try {
              sdk.startPhone(token.serverToken);
            } catch (err) {
              setPhase(PHASE.error);
              setMessage(err.message);
            }
          },
          onInitFail: (code, msg) => {
            setPhase(PHASE.error);
            setMessage(`init failed (${code}) ${msg || ''}`.trim());
          },
          onConnectSuccess: () => {
            if (!activeRef.current) return;
            setPhase(PHASE.streaming);
            setMessage('');
            if (sendHeartbeat) {
              sendHeartbeat(1).catch(() => {});
              stopHeartbeat();
              heartbeatRef.current = setInterval(() => sendHeartbeat(1).catch(() => {}), HEARTBEAT_MS);
            }
          },
          onConnectFail: (code, msg) => {
            setPhase(PHASE.error);
            setMessage(`connect failed (${code}) ${msg || ''}`.trim());
            stopHeartbeat();
          },
          onStoped: () => {
            setPhase(PHASE.stopped);
            stopHeartbeat();
          }
        }
      });
    } catch (err) {
      setPhase(PHASE.error);
      setMessage(err.message);
    }
  }, [requestToken, imageId, viewId, sendHeartbeat, stopHeartbeat]);

  // Tear the session down when the component unmounts (stops billing/heartbeat).
  useEffect(() => () => teardown(), [teardown]);

  const disconnect = () => {
    teardown();
    setPhase(PHASE.stopped);
    setMessage('');
    onClose?.();
  };

  const rotate = () => {
    rotationRef.current = rotationRef.current === 1 ? 0 : 1;
    try {
      window.BgsSdk?.setPhoneRotation?.(rotationRef.current);
    } catch {
      /* ignore when not streaming */
    }
  };

  const toggleKeyboard = () => {
    try {
      window.BgsSdk?.switchKeyboard?.();
    } catch {
      /* ignore when not streaming */
    }
  };

  const submitText = (event) => {
    event.preventDefault();
    if (!text) return;
    try {
      window.BgsSdk?.sendInputString?.(text);
      setText('');
    } catch {
      /* ignore when not streaming */
    }
  };

  const streaming = phase === PHASE.streaming;
  const busy = phase === PHASE.connecting;

  return (
    <div className="LiveControl" aria-label={`Live control for ${device?.name || imageId}`}>
      <div className="LiveControl__bar">
        <div className="LiveControl__title">
          <div className="Kicker">Live control</div>
          <h3>{device?.name || imageId || 'Cloud phone'}</h3>
        </div>
        <div className="LiveControl__meta">
          <span className={`LiveControl__status LiveControl__status--${phase}`}>
            <span className="FocusMode__dot" />
            {phase}
          </span>
          {streaming ? (
            <>
              <Button size="sm" variant="secondary" onClick={rotate}>
                rotate
              </Button>
              <Button size="sm" variant="secondary" onClick={toggleKeyboard}>
                keyboard
              </Button>
              <Button size="sm" variant="secondary" onClick={disconnect}>
                disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" variant="primary" loading={busy} onClick={connect}>
              {phase === PHASE.error || phase === PHASE.stopped ? 'reconnect' : 'connect'}
            </Button>
          )}
        </div>
      </div>

      <div className="LiveControl__stage">
        {/* BgsSdk binds the WebRTC <video>/<canvas> into this element by id. */}
        <div id={viewId} className="LiveControl__view" />
        {!streaming ? (
          <div className={`LiveControl__overlay LiveControl__overlay--${phase}`}>
            <span className="LiveControl__glyph">{phase === PHASE.error ? '⚠' : '▶'}</span>
            <small>{message || (phase === PHASE.idle ? 'Press connect to start the stream' : phase)}</small>
          </div>
        ) : null}
      </div>

      {streaming ? (
        <form className="LiveControl__input" onSubmit={submitText}>
          <input
            type="text"
            value={text}
            placeholder="Type into the device…"
            onChange={(event) => setText(event.target.value)}
            aria-label="Send text to device"
          />
          <Button size="sm" variant="secondary" type="submit" disabled={!text}>
            send
          </Button>
        </form>
      ) : null}
    </div>
  );
}
