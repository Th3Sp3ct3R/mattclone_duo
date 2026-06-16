function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function asNumber(value) {
  return Number(value || 0);
}

export function scoreAbsolute(metrics = {}) {
  const views = asNumber(metrics.views);
  const likes = asNumber(metrics.likes);
  if (views === 0 && likes === 0) return 0;

  const viewScore = Math.min(100, Math.log10(Math.max(views, 1)) * 10);
  const engagementRate = views > 0 ? likes / views : 0;
  const engagementBonus =
    engagementRate >= 0.1 ? 20 : engagementRate >= 0.05 ? 15 : engagementRate >= 0.01 ? 5 : 0;

  return clampScore(viewScore + engagementBonus);
}

export function scoreOutlier(metrics = {}, baseline = {}) {
  const baselineViews = asNumber(baseline.views || baseline.medianViews || baseline.avgViews);
  const baselineLikes = asNumber(baseline.likes || baseline.medianLikes || baseline.avgLikes);
  if (!baselineViews && !baselineLikes) return 50;

  const viewRatio = baselineViews ? asNumber(metrics.views) / baselineViews : 1;
  const likeRatio = baselineLikes ? asNumber(metrics.likes) / baselineLikes : 1;
  return clampScore(((viewRatio + likeRatio) / 2) * 20);
}

export function scoreTrending(metrics = {}, now = new Date()) {
  const publishedAt = metrics.publishedAt ? new Date(metrics.publishedAt) : null;
  if (!publishedAt || Number.isNaN(publishedAt.getTime())) return 30;

  const ageHours = Math.max(1, (now.getTime() - publishedAt.getTime()) / 3_600_000);
  if (ageHours > 24 * 7) return 0;

  const recency = ageHours <= 12 ? 40 : ageHours <= 48 ? 25 : 10;
  const viewVelocity = asNumber(metrics.views) / ageHours;
  const likeVelocity = asNumber(metrics.likes) / ageHours;
  const velocity =
    Math.min(35, Math.log10(Math.max(viewVelocity, 1)) * 7) +
    Math.min(25, Math.log10(Math.max(likeVelocity, 1)) * 6);

  return clampScore(recency + velocity);
}

export function scoreComposite(metrics = {}, baseline = {}) {
  const absolute = scoreAbsolute(metrics);
  const outlier = scoreOutlier(metrics, baseline);
  const trending = scoreTrending(metrics);
  const composite = clampScore(absolute * 0.4 + outlier * 0.4 + trending * 0.2);

  return {
    score: composite,
    dimensions: {
      absolute,
      outlier,
      trending
    }
  };
}
