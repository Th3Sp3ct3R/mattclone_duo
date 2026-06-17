import { Router } from 'express';

import {
  createDevice,
  enqueueDeviceAction,
  listDevices,
  syncDevices,
  updateDevice
} from '@julio/api/controllers/engine-devices';
import {
  listDeviceEvents,
  streamDeviceEvents
} from '@julio/api/controllers/engine-device-events';
import {
  assignDevice,
  createAccount,
  enqueueAccountAction,
  enqueueAccountOnboarding,
  listAccounts,
  unassignDevice,
  updateAccount
} from '@julio/api/controllers/engine-accounts';
import {
  createPost,
  enqueuePostAction,
  listPosts,
  updatePost
} from '@julio/api/controllers/engine-posts';
import {
  assignProxy,
  createProxy,
  enqueueProxyMonitor,
  getFleetSummary,
  listProxies,
  verifyProxyNow
} from '@julio/api/controllers/engine-inventory';
import {
  createNiche,
  createRoutingRule,
  createTransform,
  enqueueContentPoolDownload,
  ingestSourceMedia,
  listClips,
  listContentPool,
  listNiches,
  listRoutingRules,
  listSourceMedia,
  listTranscripts,
  listTransforms,
  updateContentPoolItem
} from '@julio/api/controllers/engine-content';
import {
  createExpense,
  enqueueDjekxaOrder,
  enqueueDjekxaImport,
  getDjekxaBalance,
  listDjekxaOrders,
  listDjekxaProducts,
  listExpenses
} from '@julio/api/controllers/engine-finance';
import {
  enqueueSocialScrape,
  enqueueTrend,
  listSocialPosts,
  listSocialProfiles,
  listSocialScores,
  listTrendMatches,
  listTrends
} from '@julio/api/controllers/engine-intel';
import { listJobRuns } from '@julio/api/controllers/engine-jobs';

export function createEngineRouter() {
  const router = Router();

  router.get('/fleet', getFleetSummary);
  router.get('/job-runs', listJobRuns);

  router.get('/devices', listDevices);
  router.post('/devices', createDevice);
  router.post('/devices/sync', syncDevices);
  router.put('/devices/:id', updateDevice);
  router.get('/devices/:id/events', listDeviceEvents);
  router.get('/devices/:id/events/stream', streamDeviceEvents);
  router.post('/devices/:id/actions/:action', enqueueDeviceAction);

  router.get('/accounts', listAccounts);
  router.post('/accounts', createAccount);
  router.put('/accounts/:id', updateAccount);
  router.post('/accounts/:id/assign-device', assignDevice);
  router.post('/accounts/:id/unassign-device', unassignDevice);
  router.post('/accounts/:id/onboard', enqueueAccountOnboarding);
  router.post('/accounts/:id/actions/:action', enqueueAccountAction);

  router.get('/posts', listPosts);
  router.post('/posts', createPost);
  router.put('/posts/:id', updatePost);
  router.post('/posts/:id/actions/:action', enqueuePostAction);

  router.get('/proxies', listProxies);
  router.post('/proxies', createProxy);
  router.post('/proxies/monitor', enqueueProxyMonitor);
  router.post('/proxies/:id/verify', verifyProxyNow);
  router.post('/proxies/:id/assignments', assignProxy);

  router.get('/niches', listNiches);
  router.post('/niches', createNiche);
  router.get('/content-pool', listContentPool);
  router.put('/content-pool/:id', updateContentPoolItem);
  router.post('/content-pool/:id/download', enqueueContentPoolDownload);
  router.get('/pipeline/source-media', listSourceMedia);
  router.post('/pipeline/source-media', ingestSourceMedia);
  router.get('/pipeline/transcripts', listTranscripts);
  router.get('/pipeline/clips', listClips);
  router.get('/transforms', listTransforms);
  router.post('/transforms', createTransform);
  router.get('/routing-rules', listRoutingRules);
  router.post('/routing-rules', createRoutingRule);

  router.get('/social/profiles', listSocialProfiles);
  router.get('/social/posts', listSocialPosts);
  router.get('/social/scores', listSocialScores);
  router.post('/social/scrape', enqueueSocialScrape);
  router.get('/trends', listTrends);
  router.post('/trends', enqueueTrend);
  router.get('/trend-matches', listTrendMatches);

  router.get('/expenses', listExpenses);
  router.post('/expenses', createExpense);
  router.get('/djekxa/balance', getDjekxaBalance);
  router.get('/djekxa/products', listDjekxaProducts);
  router.get('/djekxa/orders', listDjekxaOrders);
  router.post('/djekxa/import', enqueueDjekxaImport);
  router.post('/djekxa/orders', enqueueDjekxaOrder);

  return router;
}
