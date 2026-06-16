import { env } from '@julio/api/config/env';
import { EngineContentChunk, EngineTrend, EngineTrendMatch } from '@julio/api/models/engine-trend';
import { createOpenRouterClient } from '@julio/integrations';
import { prepareTrend, rerankTrendCandidates, selectVectorCandidates } from '@julio/intelligence';

import { runEngineJob } from '../engine-job-runner.js';

function getTrendLlm() {
  if (!env.openRouterApiKey) return null;
  return createOpenRouterClient({ apiKey: env.openRouterApiKey, model: env.trendRerankModel });
}

async function upsertTrendFromPayload(payload = {}) {
  if (!payload.title && !payload.description) return null;
  const prepared = await prepareTrend(payload, { embeddingModel: env.embeddingModel });
  return EngineTrend.findOneAndUpdate(
    {
      platform: prepared.platform,
      'metadata.slug': prepared.metadata.slug || prepared.title,
      nicheKey: prepared.nicheKey
    },
    prepared,
    { upsert: true, new: true }
  );
}

async function runMatching() {
  const trends = await EngineTrend.find({}).sort({ observedAt: -1 }).limit(100).lean();
  const chunks = await EngineContentChunk.find({ 'embedding.vector.0': { $exists: true } }).sort({ createdAt: -1 }).limit(5000).lean();
  const llm = getTrendLlm();
  let matched = 0;

  for (const trend of trends) {
    const candidates = selectVectorCandidates(trend, chunks, { topK: 50 });
    const reranked = await rerankTrendCandidates({ llm, trend, candidates, topK: 5 });
    for (const match of reranked) {
      await EngineTrendMatch.findOneAndUpdate(
        { trendId: trend._id, contentChunkId: match.chunk._id },
        {
          trendId: trend._id,
          contentChunkId: match.chunk._id,
          score: match.score,
          rationale: match.rationale,
          metadata: { vectorScore: candidates.find((candidate) => String(candidate.chunk._id) === String(match.chunk._id))?.vectorScore || 0 }
        },
        { upsert: true, new: true }
      );
      matched += 1;
    }
  }

  return { trends: trends.length, matched };
}

async function updateFeedback() {
  const matches = await EngineTrendMatch.find({}).sort({ updatedAt: -1 }).limit(500).lean();
  const grouped = new Map();
  for (const match of matches) {
    const key = String(match.trendId);
    grouped.set(key, [...(grouped.get(key) || []), match.score]);
  }
  for (const [trendId, scores] of grouped.entries()) {
    const avg = scores.reduce((sum, score) => sum + Number(score || 0), 0) / scores.length;
    await EngineTrend.findByIdAndUpdate(trendId, {
      outlierRatio: avg,
      'metadata.lastFeedbackAt': new Date()
    });
  }
  return { updated: grouped.size };
}

export async function handleTrendJob(payload) {
  return runEngineJob(payload, async ({ jobName, payload: jobPayload }) => {
    if (jobName === 'upsert') {
      const trend = await upsertTrendFromPayload(jobPayload);
      return { trendId: trend ? String(trend._id) : null };
    }
    if (jobName === 'match') return runMatching();
    if (jobName === 'feedback') return updateFeedback();
    throw new Error(`Unknown trend job: ${jobName}`);
  });
}
