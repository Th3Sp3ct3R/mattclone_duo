/**
 * Gematria Randomizer
 * ===================
 *
 * Deterministic-yet-varied output selection using letter-to-number
 * reduction, derived from Kabbalistic gematria (Mispar Katan — the
 * single-digit reduction). Same input always produces the same output;
 * different inputs produce different outputs.
 *
 * The key idea: sum each letter's mod-9 value, reduce to one digit
 * (1–9), use that as a deterministic index into a 9-element pool.
 * For engagement automation this is much better than `Math.random()`
 * because a given post caption always picks the same comment voice —
 * no jitter on reruns, no A/B drift, no per-device disagreement.
 *
 * Three small primitives:
 *   - gematriaKatan(text)  → number 1–9
 *   - pool9(text, options) → option[index]
 *   - sefirahFor(text)     → { name, quality, voice }
 *
 * The 9 Sefirot (Chokhmah through Malkuth) are used as a comment-voice
 * palette because they give natural variety — wisdom, severity, warmth,
 * skepticism, beauty, persistence, aesthetic, practical, concrete —
 * without overlapping each other.
 */

// Letter → value, Latin only (matches what we see in IG captions).
// English-gematria commonly maps A=1..Z=26 with I/J/ U/V collapsed.
// We use A=1..Z=26 and reduce mod 9 for mispar katan.
const A_INDEX = 'a'.charCodeAt(0);

/**
 * Mispar Katan of `text` — sum each letter's mod-9 value, reduce to a
 * single digit 1–9 (never 0, since 0 in Hebrew gematria represents
 * "Ein Sof" / the unlimited). Mod-9 reduction is used instead of the
 * full Hebrew alphabet so this works on any Latin-only text input
 * (IG captions, hashtags, screen text from vision reads).
 *
 * @param {string} text
 * @returns {number} 1..9
 */
export function gematriaKatan(text) {
  if (!text) return 1;
  // First pass: each Latin letter maps to its single-digit katan value
  // using the same cycle as Hebrew (alef=1, bet=2, ..., tet=9, yod=1, kaf=2, ...).
  // For 0-indexed English letters, that is `(code % 9) + 1`. So:
  //   A → 1, B → 2, ..., I → 9, J → 1, K → 2, ..., R → 9, S → 1, ..., Z → 8.
  let sum = 0;
  for (const ch of String(text).toLowerCase()) {
    const code = ch.charCodeAt(0) - A_INDEX;
    if (code < 0 || code > 25) continue; // skip non-letters, spaces, digits
    sum += (code % 9) + 1;
  }
  if (sum === 0) return 1;
  // Reduce to single digit by digit-sum (analog of Mispar Katan on the sum itself).
  while (sum >= 10) {
    let next = 0;
    while (sum > 0) {
      next += sum % 10;
      sum = Math.floor(sum / 10);
    }
    sum = next;
    if (sum === 0) return 9;
  }
  return sum;
}

/**
 * Pick option[index] deterministically from a 9-or-smaller pool.
 * If pool is shorter than 9, wraps around with modulo. If pool is
 * longer, takes the first 9 by default — pass `{ full: true }` to use
 * the full pool via modular hashing instead.
 *
 * @template T
 * @param {string} key
 * @param {T[]} pool
 * @param {{ full?: boolean }} [opts]
 * @returns {T}
 */
export function pool9(key, pool, opts = {}) {
  if (!Array.isArray(pool) || pool.length === 0) {
    throw new Error('pool9: pool must be a non-empty array');
  }
  if (opts.full) {
    const idx = gematriaKatan(key) % pool.length;
    return pool[idx];
  }
  const idx = (gematriaKatan(key) - 1) % Math.min(pool.length, 9);
  return pool[idx];
}

/**
 * The 9 Sefirot (Chokhmah → Malkuth) as a comment-voice palette. Keter
 * is intentionally excluded — it's the "too transcendent to land"
 * emanation, which reads as awkward when injected into an IG comment.
 *
 * Each voice maps to a typical IG comment register.
 *
 * @type {Array<{name: string, quality: string, voice: string}>}
 */
export const SEFIROT_VOICES = [
  {
    name: 'Chokhmah',
    quality: 'Lightning insight',
    voice: 'drops a sharp observation that makes the rest of the thread reread the post'
  },
  {
    name: 'Binah',
    quality: 'Analytical',
    voice: 'breaks down the mechanism that makes the post work (or not work)'
  },
  {
    name: 'Chesed',
    quality: 'Warm supporter',
    voice: 'sends gratitude, names a specific payoff, often tags a person'
  },
  {
    name: 'Gevurah',
    quality: 'Skeptical',
    voice: 'names one hard objection and asks the creator to respond to it'
  },
  {
    name: 'Tiferet',
    quality: 'Balanced',
    voice: 'agrees with the post, then names one realistic trade-off the creator left out'
  },
  {
    name: 'Netzach',
    quality: 'Persistent',
    voice: 'reports back having tried the thing for X iterations, with measurable result'
  },
  {
    name: 'Hod',
    quality: 'Aesthetic',
    voice: 'calls out a small craft detail (typography, a transition, a single line of code)'
  },
  {
    name: 'Yesod',
    quality: 'Practical foundation',
    voice: 'asks a setup question that any builder reading needs answered before they try it'
  },
  {
    name: 'Malkuth',
    quality: 'Concrete',
    voice: 'reports what they actually saw on a specific device/model/account last week'
  }
];

/**
 * Pick a Sefirah voice from a key (e.g., a post caption). Always returns
 * the same voice for the same key — so a post will consistently get a
 * "Gevurah" comment across all devices, but two different posts will
 * get different voices.
 *
 * @param {string} key
 * @returns {{name: string, quality: string, voice: string}}
 */
export function sefirahFor(key) {
  return pool9(key, SEFIROT_VOICES);
}

/**
 * Atbash — substitutes each letter with its mirror from the opposite
 * end of the alphabet (A↔Z, B↔Y, C↔X, ...). The Hebrew Atbash cipher
 * encodes a complete character mapping; here we use the Latin form.
 *
 * Not used to encode comments (the result is unreadable), but useful
 * for generating *variants* of a comment phrase that look superficially
 * different to a pattern detector while still sharing meaning. See
 * `atbashVariant(text)` below.
 *
 * @param {string} text
 * @returns {string}
 */
export function atbash(text) {
  let out = '';
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    const isUpper = code >= 65 && code <= 90;
    const isLower = code >= 97 && code <= 122;
    if (isUpper) {
      out += String.fromCharCode(90 - (code - 65));
    } else if (isLower) {
      out += String.fromCharCode(122 - (code - 97));
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Generate an atbash-flipped variant of a comment. Caps letter density
 * at 20–30% of the original word count so it still parses. Useful for
 * passing past a regex detector that pattern-matches on common phrases.
 *
 * @param {string} text
 * @returns {string}
 */
export function atbashVariant(text) {
  const words = String(text).split(/\s+/).filter(Boolean);
  return words.map((word, idx) => {
    // Replace every 4th–5th word with its atbash form (deterministic)
    const gk = gematriaKatan(word);
    if (gk === 4 || gk === 7) return atbash(word);
    return word;
  }).join(' ');
}
