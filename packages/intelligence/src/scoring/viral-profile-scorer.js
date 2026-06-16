function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function average(values) {
  const nums = values.map(Number).filter((value) => Number.isFinite(value));
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : 0;
}

function standardDeviation(values) {
  const mean = average(values);
  if (!mean) return 0;
  const variance = average(values.map((value) => (Number(value) - mean) ** 2));
  return Math.sqrt(variance);
}

function profileTier(score) {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 50) return 'B';
  if (score >= 30) return 'C';
  return 'D';
}

export function scoreViralProfile({ metrics = {}, postScores = [], audience = {}, digest = {} } = {}) {
  const followers = Number(metrics.followers || 0);
  const totalViews = Number(metrics.views || metrics.totalViews || 0);
  const scaleReach = clamp(((Math.log10(Math.max(followers, 1)) + Math.log10(Math.max(totalViews, 1))) / 14) * 100);

  const avgPostPerformance = clamp(average(postScores));
  const growthMomentum = clamp(Number(metrics.followerGrowthRate || 0) * 600 + Number(metrics.postsPerWeek || 0) * 5.7);

  const consistency =
    postScores.length < 3
      ? 50
      : clamp(100 - (standardDeviation(postScores) / Math.max(average(postScores), 1)) * 100);

  const audienceLoyalty = clamp(
    Number(audience.repeatCommenterRate || 0) * 40 +
      Number(audience.repeatLikerRate || 0) * 30 +
      Number(audience.commentDepthScore || 0) * 30
  );

  const nicheAuthority = clamp(
    Number(digest.tagCoherence || 0) * 60 +
      (digest.hasConsistentFormat ? 15 : 0) +
      (digest.hasClearAudience ? 15 : 0) +
      (digest.hasRepeatableHooks ? 10 : 0)
  );

  const score = clamp(
    scaleReach * 0.2 +
      avgPostPerformance * 0.25 +
      growthMomentum * 0.2 +
      consistency * 0.15 +
      audienceLoyalty * 0.1 +
      nicheAuthority * 0.1
  );

  return {
    score,
    tier: profileTier(score),
    recommendation:
      score >= 85 ? 'partner_outreach' : score >= 70 ? 'daily_scrape' : score >= 50 ? 'weekly_scrape' : 'archive',
    dimensions: {
      scaleReach,
      avgPostPerformance,
      growthMomentum,
      consistency,
      audienceLoyalty,
      nicheAuthority
    }
  };
}
