import { rankByCosineSimilarity } from '@julio/shared';

import { embedText } from './embeddings.js';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseJsonContent(response) {
  const content = response?.choices?.[0]?.message?.content || '';
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : content);
}

export function trendFromManual(input = {}) {
  return {
    platform: input.platform || 'tiktok',
    nicheKey: input.nicheKey || '',
    title: input.title || input.name || '',
    description: input.description || input.summary || '',
    sourceUrl: input.sourceUrl || '',
    reach: Number(input.reach || 0),
    outlierRatio: Number(input.outlierRatio || input.relevance || 0),
    observedAt: input.observedAt ? new Date(input.observedAt) : new Date(),
    metadata: {
      source: 'manual',
      slug: slugify(input.slug || input.title || input.name),
      expiresAt: input.expiresAt || null,
      raw: input
    }
  };
}

export async function prepareTrend(input, { embeddingModel } = {}) {
  const trend = trendFromManual(input);
  const vector = await embedText(`${trend.title}\n${trend.description}`, { model: embeddingModel });
  return {
    ...trend,
    embedding: {
      provider: 'local',
      model: embeddingModel || 'Xenova/all-MiniLM-L6-v2',
      vector
    }
  };
}

export function selectVectorCandidates(trend, chunks = [], { topK = 50 } = {}) {
  const vector = trend?.embedding?.vector || [];
  const ranked = rankByCosineSimilarity(
    vector,
    chunks
      .filter((chunk) => Array.isArray(chunk.embedding?.vector) && chunk.embedding.vector.length === vector.length)
      .map((chunk) => ({ id: String(chunk._id || chunk.id), vector: chunk.embedding.vector, item: chunk })),
    (entry) => entry.vector
  );
  return ranked.slice(0, topK).map((entry) => ({
    chunk: entry.entry.item,
    vectorScore: entry.score
  }));
}

export async function rerankTrendCandidates({ llm, trend, candidates, topK = 5 } = {}) {
  if (!candidates.length) return [];
  if (!llm) {
    return candidates.slice(0, topK).map((candidate) => ({
      chunk: candidate.chunk,
      score: candidate.vectorScore,
      rationale: 'Ranked by local vector similarity.'
    }));
  }

  const response = await llm.complete({
    temperature: 0.2,
    responseFormat: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Rerank content chunks for trend relevance. Return JSON: {"matches":[{"index":0,"score":0.0,"rationale":"short"}]}.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          trend: { title: trend.title, description: trend.description, nicheKey: trend.nicheKey },
          chunks: candidates.map((candidate, index) => ({
            index,
            vectorScore: candidate.vectorScore,
            text: candidate.chunk.text
          }))
        })
      }
    ]
  });

  const parsed = parseJsonContent(response);
  return (parsed.matches || [])
    .map((match) => {
      const candidate = candidates[Number(match.index)];
      if (!candidate) return null;
      return {
        chunk: candidate.chunk,
        score: Math.max(0, Math.min(1, Number(match.score || 0))),
        rationale: String(match.rationale || '')
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
