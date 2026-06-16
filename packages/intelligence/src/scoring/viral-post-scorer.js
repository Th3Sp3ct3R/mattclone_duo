function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function safeDivide(numerator, denominator, fallback = 0) {
  return denominator ? numerator / denominator : fallback;
}

function normalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

function weightedEngagement(platform, metrics = {}) {
  const likes = Number(metrics.likes || 0);
  const comments = Number(metrics.comments || 0);
  const shares = Number(metrics.shares || 0);
  const saves = Number(metrics.saves || 0);
  return platform === 'instagram'
    ? likes + comments * 3 + shares * 3 + saves * 4
    : likes + comments * 3 + shares * 2;
}

function scoreTier(score) {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'D';
}

export function scoreViralPost({
  platform = 'tiktok',
  metrics = {},
  creatorBaseline = {},
  contentSignal = {},
  socialProofBaseline = {},
  now = new Date()
} = {}) {
  const views = Number(metrics.views || 0);
  const likes = Number(metrics.likes || 0);
  const comments = Number(metrics.comments || 0);
  const publishedAt = metrics.publishedAt ? new Date(metrics.publishedAt) : now;
  const ageHours = Math.max(1, (now.getTime() - publishedAt.getTime()) / 3_600_000);
  const engagement = weightedEngagement(platform, metrics);
  const engagementRate = safeDivide(likes + comments, views);

  const absoluteReach = clamp((Math.log10(Math.max(views, 1)) / 7) * 100 * (1 + Math.min(0.5, engagementRate * 5)));
  const maxWeightedEngagement = platform === 'instagram' ? 250_000 : 200_000;
  const engagementDepth = clamp((engagement / maxWeightedEngagement) * 100);
  const velocityMultiplier =
    platform === 'instagram'
      ? 1 + safeDivide(Number(metrics.saves || 0), Math.max(views, 1)) * 0.6
      : 1;
  const velocity = clamp((engagement / ageHours / 10_000) * 100 * velocityMultiplier);

  const mean = Number(creatorBaseline.meanWeightedEngagement || creatorBaseline.avgEngagement || 0);
  const stddev = Math.max(1, Number(creatorBaseline.stddevWeightedEngagement || creatorBaseline.stddevEngagement || mean * 0.35 || 1));
  const creatorOutlier = mean ? clamp(normalCdf((engagement - mean) / stddev) * 100) : 50;

  const signalFlags = [
    contentSignal.hasStrongHook,
    contentSignal.isNativeToPlatform,
    contentSignal.hasClearPayoff,
    contentSignal.isEvergreen,
    contentSignal.isTrendAligned
  ].filter(Boolean).length;
  const contentScore = clamp(signalFlags * 18 + Number(contentSignal.llmScore || 0) * 10);

  const commentRatio = safeDivide(comments, likes + 1);
  const socialProof = clamp(safeDivide(commentRatio, Number(socialProofBaseline.commentRatio || 0.02), 1) * 50);

  const score = clamp(
    absoluteReach * 0.25 +
      engagementDepth * 0.25 +
      velocity * 0.15 +
      creatorOutlier * 0.2 +
      contentScore * 0.1 +
      socialProof * 0.05
  );

  return {
    score,
    tier: scoreTier(score),
    recommendation: score >= 85 ? 'auto_repost' : score >= 70 ? 'review_fast' : score >= 50 ? 'review' : 'skip',
    dimensions: {
      absoluteReach,
      engagementDepth,
      velocity,
      creatorOutlier,
      contentSignal: contentScore,
      socialProof
    },
    weightedEngagement: engagement
  };
}
