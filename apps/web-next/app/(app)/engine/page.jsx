'use client';

import { useEffect, useState } from 'react';

import { api } from '@julio/api-client';
import { Button } from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';

import { EngineFinanceProxyPanel } from '@/app/(app)/engine/components/EngineFinanceProxyPanel.jsx';
import { EngineIntelligencePanel } from '@/app/(app)/engine/components/EngineIntelligencePanel.jsx';
import {
  EngineOperationsPanel,
  initialAccountForm,
  initialPostForm
} from '@/app/(app)/engine/components/EngineOperationsPanel.jsx';
import { EngineStatGrid } from '@/app/(app)/engine/components/EngineStatGrid.jsx';

const emptySummary = { devices: 0, accounts: 0, activePosts: 0, proxies: 0 };
const initialScrapeForm = { platform: 'tiktok', handle: '', url: '' };
const initialTrendForm = { platform: 'tiktok', title: '', description: '', nicheKey: '' };
const initialOrderForm = { productId: '', quantity: '1', expectedPriceRub: '', maxTotalRub: '' };

export default function EnginePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(emptySummary);
  const [devices, setDevices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [jobRuns, setJobRuns] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [sourceMedia, setSourceMedia] = useState([]);
  const [clips, setClips] = useState([]);
  const [socialScores, setSocialScores] = useState([]);
  const [trends, setTrends] = useState([]);
  const [trendMatches, setTrendMatches] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [djekxaOrders, setDjekxaOrders] = useState([]);
  const [djekxaBalance, setDjekxaBalance] = useState(null);
  const [actionKey, setActionKey] = useState('');
  const [accountForm, setAccountForm] = useState(initialAccountForm);
  const [postForm, setPostForm] = useState(initialPostForm);
  const [scrapeForm, setScrapeForm] = useState(initialScrapeForm);
  const [trendForm, setTrendForm] = useState(initialTrendForm);
  const [orderForm, setOrderForm] = useState(initialOrderForm);

  async function loadEngine({ showSpinner = true } = {}) {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const [
        fleet,
        deviceData,
        accountData,
        postData,
        jobRunData,
        proxyData,
        contentData,
        sourceData,
        clipData,
        scoreData,
        trendData,
        matchData,
        expenseData,
        orderData,
        balanceData
      ] = await Promise.all([
        api.engine.getFleetSummary(),
        api.engine.getDevices(),
        api.engine.getAccounts(),
        api.engine.getPosts(),
        api.engine.getJobRuns(),
        api.engine.getProxies(),
        api.engine.getContentPool(),
        api.engine.getSourceMedia(),
        api.engine.getClips(),
        api.engine.getSocialScores(),
        api.engine.getTrends(),
        api.engine.getTrendMatches(),
        api.engine.getExpenses(),
        api.engine.getDjekxaOrders(),
        api.engine.getDjekxaBalance().catch(() => ({ balance: null }))
      ]);
      setSummary(fleet.summary || emptySummary);
      setDevices(deviceData.devices || []);
      setAccounts(accountData.accounts || []);
      setPosts(postData.posts || []);
      setJobRuns(jobRunData.jobRuns || []);
      setProxies(proxyData.proxies || []);
      setContentItems(
        (contentData.items || []).map((item) => ({
          ...item,
          download: () => api.engine.downloadContentPoolItem(item._id),
          reject: () => api.engine.updateContentPoolItem(item._id, { status: 'rejected' })
        }))
      );
      setSourceMedia(sourceData.media || []);
      setClips(clipData.clips || []);
      setSocialScores(scoreData.scores || []);
      setTrends(trendData.trends || []);
      setTrendMatches(matchData.matches || []);
      setExpenses(expenseData.expenses || []);
      setDjekxaOrders(orderData.orders || []);
      setDjekxaBalance(balanceData.balance || null);
    } catch (err) {
      const message = err?.message || 'Failed to load engine data.';
      setError(message);
      notifications.notify({ title: 'Engine error', message });
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    loadEngine().finally(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, []);

  async function runAction(key, action, successTitle = 'Engine job queued') {
    setActionKey(key);
    try {
      await action();
      notifications.notify({ title: successTitle, message: key });
      await loadEngine({ showSpinner: false });
    } catch (err) {
      notifications.notify({ title: 'Engine action failed', message: err?.message || 'Request failed' });
    } finally {
      setActionKey('');
    }
  }

  function actionButton(label, key, type, id) {
    const action =
      type === 'device'
        ? () => api.engine.enqueueDeviceAction(id, label)
        : type === 'account'
          ? () => api.engine.enqueueAccountAction(id, label)
          : () => api.engine.enqueuePostAction(id, label);
    return (
      <Button key={key} size="sm" variant="secondary" loading={actionKey === key} onClick={() => runAction(key, action)}>
        {label}
      </Button>
    );
  }

  async function syncDevices() {
    await runAction('devices:sync:vmos', () => api.engine.syncDevices('vmos'), 'VMOS devices synced');
  }

  async function syncDuoPlusDevices() {
    await runAction('devices:sync:duoplus', () => api.engine.syncDevices('duoplus'), 'DuoPlus devices synced');
  }

  async function refreshDeviceStatus(device) {
    await runAction(
      `device:${device._id}:status`,
      () => api.engine.getDeviceStatus(device._id),
      'Device status refreshed'
    );
  }

  async function loadDeviceFocus(device, quality = {}) {
    return api.engine.getDeviceFocus(device._id, quality);
  }

  async function fetchDuoPlusFrames() {
    return api.engine.getDuoPlusFrames();
  }

  async function captureDeviceFrame(device) {
    await runAction(
      `device:${device._id}:screenshot`,
      () => api.engine.enqueueDeviceAction(device._id, 'screenshot'),
      'Frame capture queued'
    );
  }

  // Powering on a parked cloud phone may incur temporary-startup billing, so it
  // is gated behind an explicit confirmation — never auto-started.
  async function startDeviceConfirmed(device) {
    const label = device.name || device.providerDeviceId;
    const ok =
      typeof window === 'undefined' ||
      window.confirm(`Power ON "${label}"? This starts a cloud phone and may incur temporary-startup charges.`);
    if (!ok) return;
    await runAction(
      `device:${device._id}:start`,
      () => api.engine.enqueueDeviceAction(device._id, 'start'),
      'Power on queued'
    );
  }

  async function createAccount(event) {
    event.preventDefault();
    await runAction(
      'account:create',
      async () => {
        await api.engine.createAccount({
          platform: accountForm.platform,
          username: accountForm.username,
          password: accountForm.password,
          email: accountForm.email,
          displayName: accountForm.displayName,
          bio: accountForm.bio,
          avatarUrl: accountForm.avatarUrl,
          nicheKey: accountForm.nicheKey,
          assignedDeviceId: accountForm.deviceId === 'none' ? null : accountForm.deviceId
        });
        setAccountForm(initialAccountForm);
      },
      'Account created'
    );
  }

  async function assignAccountDevice(account, deviceId) {
    await runAction(
      `account:${account._id}:assign`,
      () => api.engine.assignDevice(account._id, deviceId),
      'Device assigned'
    );
  }

  async function unassignAccountDevice(account) {
    await runAction(
      `account:${account._id}:assign`,
      () => api.engine.unassignDevice(account._id),
      'Device unassigned'
    );
  }

  async function onboardAccount(account, payload) {
    await runAction(
      `account:${account._id}:onboard`,
      () => api.engine.enqueueAccountOnboarding(account._id, payload),
      'Onboarding queued'
    );
  }

  async function createPost(event) {
    event.preventDefault();
    const hashtags = postForm.hashtags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    await runAction('post:create', async () => {
      await api.engine.createPost({
        platform: postForm.platform,
        postType: postForm.platform === 'youtube' ? postForm.postType || 'short' : postForm.postType || '',
        accountId: postForm.accountId === 'none' ? '' : postForm.accountId,
        deviceId: postForm.deviceId === 'none' ? null : postForm.deviceId,
        sourceUrl: postForm.sourceUrl,
        caption: postForm.caption,
        hashtags
      });
      setPostForm(initialPostForm);
    });
  }

  const enrichedScrapeForm = {
    ...scrapeForm,
    submit: () => api.engine.enqueueSocialScrape(scrapeForm)
  };
  const enrichedTrendForm = {
    ...trendForm,
    submit: () => api.engine.enqueueTrend(trendForm),
    match: () => api.engine.enqueueTrend({ action: 'match' }),
    feedback: () => api.engine.enqueueTrend({ action: 'feedback' })
  };
  const enrichedOrderForm = {
    ...orderForm,
    submit: () => api.engine.enqueueDjekxaOrder(orderForm),
    importOrders: () => api.engine.enqueueDjekxaImport({})
  };
  const enrichedProxies = {
    rows: proxies.map((proxy) => ({ ...proxy, verify: () => api.engine.verifyProxy(proxy._id) })),
    monitor: () => api.engine.enqueueProxyMonitor()
  };

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <div className="page-section-header">
        <h1>Engine</h1>
        <p className="Kicker">Operator console for devices, accounts, posting, content, and proxies.</p>
      </div>

      {error ? <div className="Error">{error}</div> : null}

      <EngineStatGrid summary={summary} loading={loading} />
      <EngineOperationsPanel
        devices={devices}
        accounts={accounts}
        posts={posts}
        jobRuns={jobRuns}
        postForm={postForm}
        setPostForm={setPostForm}
        accountForm={accountForm}
        setAccountForm={setAccountForm}
        actionKey={actionKey}
        actionButton={actionButton}
        createAccount={createAccount}
        createPost={createPost}
        syncDevices={syncDevices}
        syncDuoPlusDevices={syncDuoPlusDevices}
        refreshDeviceStatus={refreshDeviceStatus}
        captureDeviceFrame={captureDeviceFrame}
        startDeviceConfirmed={startDeviceConfirmed}
        onPoll={() => loadEngine({ showSpinner: false })}
        fetchFrames={fetchDuoPlusFrames}
        loadDeviceFocus={loadDeviceFocus}
        assignAccountDevice={assignAccountDevice}
        unassignAccountDevice={unassignAccountDevice}
        onboardAccount={onboardAccount}
      />
      <EngineIntelligencePanel contentItems={contentItems} sourceMedia={sourceMedia} clips={clips} socialScores={socialScores} trends={trends} trendMatches={trendMatches} actionKey={actionKey} runAction={runAction} scrapeForm={enrichedScrapeForm} setScrapeForm={setScrapeForm} trendForm={enrichedTrendForm} setTrendForm={setTrendForm} />
      <EngineFinanceProxyPanel proxies={enrichedProxies} expenses={expenses} djekxaOrders={djekxaOrders} djekxaBalance={djekxaBalance} orderForm={enrichedOrderForm} setOrderForm={setOrderForm} actionKey={actionKey} runAction={runAction} />
    </div>
  );
}
