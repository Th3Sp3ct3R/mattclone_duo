function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function humanDelayMs({ meanMs = 750, standardDeviationMs = 200, minMs = 100, maxMs = 3_000 } = {}) {
  return Math.round(clamp(meanMs + gaussianRandom() * standardDeviationMs, minMs, maxMs));
}

export function jitterPoint({ x, y, radius = 6 } = {}) {
  return {
    x: Math.round(Number(x || 0) + gaussianRandom() * radius),
    y: Math.round(Number(y || 0) + gaussianRandom() * radius)
  };
}

export function createSeededPersonality(seed = '') {
  const source = String(seed || 'default');
  const hash = [...source].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  return {
    tapRadius: 4 + (hash % 7),
    delayMultiplier: 0.85 + (hash % 30) / 100,
    hesitationRate: (hash % 12) / 100
  };
}
