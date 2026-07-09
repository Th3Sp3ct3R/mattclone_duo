import {
  gematriaKatan,
  pool9,
  sefirahFor,
  SEFIROT_VOICES,
  atbash,
  atbashVariant
} from '../gematria-randomizer.js';

describe('gematria-randomizer', () => {
  describe('gematriaKatan', () => {
    it('returns a value in 1..9', () => {
      for (const s of ['', 'a', 'hello', 'IG', 'foo bar baz', 'aaaaaaaaa']) {
        const v = gematriaKatan(s);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    });

    it('is deterministic for the same input', () => {
      expect(gematriaKatan('hello world')).toBe(gematriaKatan('hello world'));
      expect(gematriaKatan('agentops')).toBe(gematriaKatan('agentops'));
    });

    it('produces different values for different inputs (most of the time)', () => {
      const a = gematriaKatan('agentops');
      const b = gematriaKatan('duoplus');
      const c = gematriaKatan('jarvis');
      const d = gematriaKatan('claude');
      // Collisions are possible in mod-9 space; just assert at least 2 distinct values.
      const distinct = new Set([a, b, c, d]);
      expect(distinct.size).toBeGreaterThanOrEqual(2);
    });

    it('handles empty input as 1', () => {
      expect(gematriaKatan('')).toBe(1);
      expect(gematriaKatan(null)).toBe(1);
      expect(gematriaKatan(undefined)).toBe(1);
    });

    it('treats kabbalah as a stable seed', () => {
      // kabbalah: k=11, a=1, b=2, b=2, a=1, l=12, a=1, h=8
      // Mispar katan (mod-9 each then sum): 2+1+2+2+1+3+1+8 = 20 → 2+0 = 2
      expect(gematriaKatan('kabbalah')).toBe(2);
    });
  });

  describe('pool9', () => {
    it('returns deterministic picks', () => {
      const options = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
      expect(pool9('key1', options)).toBe(pool9('key1', options));
    });

    it('wraps for pools shorter than 9', () => {
      const options = ['a', 'b', 'c'];
      // Index derived from gematriaKatan mod length when full=true
      expect(pool9('hello', options, { full: true })).toBeTruthy();
    });

    it('throws on empty pool', () => {
      expect(() => pool9('x', [])).toThrow();
    });
  });

  describe('sefirahFor', () => {
    it('returns one of the 9 voices', () => {
      for (const key of ['agentops', 'duoplus', 'jarvis', 'claude', 'kabbalah', 'hermesagent']) {
        const v = sefirahFor(key);
        expect(SEFIROT_VOICES).toContain(v);
      }
    });

    it('Keter is intentionally not in the palette', () => {
      const names = SEFIROT_VOICES.map((v) => v.name);
      expect(names).not.toContain('Keter');
    });

    it('exact voice for a known seed', () => {
      // gematriaKatan('hello world') = ?
      // h=8, e=5, l=3, l=3, o=6, w=5, o=6, r=9, l=3, d=4 → 8+5+3+3+6+5+6+9+3+4 = 52 → 5+2 = 7
      const v = sefirahFor('hello world');
      expect(v.name).toBe('Hod'); // 7th voice (0-indexed 6)
    });
  });

  describe('atbash', () => {
    it('flips letters correctly', () => {
      expect(atbash('a')).toBe('z');
      expect(atbash('z')).toBe('a');
      expect(atbash('hello')).toBe('svool');
      expect(atbash('Svool')).toBe('Hello');
    });

    it('preserves non-letters', () => {
      expect(atbash('a-b c')).toBe('z-y x');
      expect(atbash('hi 123')).toBe('sr 123');
    });

    it('produces a comment variant', () => {
      const orig = 'this is the dhash pattern from ScreenCheckpoint';
      const variant = atbashVariant(orig);
      expect(variant.length).toBeGreaterThan(0);
      expect(variant).not.toBe(orig); // some words should differ
    });
  });
});
