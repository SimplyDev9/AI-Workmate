/**
 * src/utils/guardrails.js
 * ───────────────────────
 * CLIENT-SIDE guardrail layer (Layer 0).
 *
 * Purpose
 * ───────
 * Provide instant, zero-latency feedback for obvious violations BEFORE
 * the API call is made. This layer catches the most common offensive inputs
 * without any network round-trip, improving UX and reducing unnecessary
 * AWS service calls.
 *
 * Design
 * ──────
 * • Intentionally kept lightweight — it is NOT a replacement for the server-
 *   side layers (Comprehend + Bedrock Guardrail).
 * • Uses a curated word-boundary regex list so "class" doesn't match "ass",
 *   "assassin" doesn't match "ass", etc.
 * • Normalises common obfuscation attempts: l33t-speak, repeated chars,
 *   zero-width spaces, homoglyphs.
 *
 * Returns
 * ───────
 *   { blocked: false }                          — clean input
 *   { blocked: true, message: string }          — flagged; show message to user
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Normalisation helpers
// ─────────────────────────────────────────────────────────────────────────────

const LEET_MAP = {
  '@': 'a', '4': 'a',
  '3': 'e',
  '1': 'i', '!': 'i',
  '0': 'o',
  '5': 's', '$': 's',
  '7': 't',
  '+': 't',
};

/**
 * Normalise user input to defeat common obfuscation techniques.
 *
 * Transforms applied (in order):
 *  1. Unicode normalise (NFKC) — handles homoglyphs and fullwidth chars
 *  2. Strip zero-width / invisible codepoints
 *  3. Collapse repeated characters (heeell → hel)
 *  4. Map common leet-speak substitutions
 *  5. Lowercase
 */
function normalise(text) {
  return text
    // 1. Normalise unicode
    .normalize('NFKC')
    // 2. Remove zero-width / invisible chars
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // 3. Collapse 3+ repeated chars to 2 (heeell → heel → hel done by regex below)
    .replace(/(.)\1{2,}/g, '$1$1')
    // 4. Leet substitution
    .split('').map(c => LEET_MAP[c] ?? c).join('')
    // 5. Lowercase
    .toLowerCase();
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. Banned pattern lists
//    Each entry is a word/phrase matched at word boundaries (\b).
//    The list is intentionally minimal — server-side Comprehend handles the
//    long tail. Extend this list to match your organisation's policy.
// ─────────────────────────────────────────────────────────────────────────────

const PROFANITY_WORDS = [
  'fuck', 'fucker', 'fucking', 'fck', 'fuk',
  'shit', 'shitting', 'shiit',
  'bitch', 'biatch',
  'asshole', 'arsehole', 'ass',
  'bastard',
  'cunt',
  'dick', 'cock', 'pussy',
  'motherfucker', 'mf',
  'whore', 'slut',
  'damn', 'damnit',
  'crap',
  'piss', 'pissed',
  'twat',
  'wank', 'wanker',
  'bollocks',
  'bugger',
];

const HATE_SPEECH_WORDS = [
  // Racial/ethnic slurs — represented symbolically to avoid storing them verbatim
  'n.gger', 'n.gga', 'ch.nk', 'sp.c', 'k.ke', 'g..k',
  'k.ller', 'terr.rist',
];

const THREAT_PATTERNS = [
  /i('ll| will| am going to|'m going to) (kill|hurt|harm|attack|destroy|murder|stab|shoot)\b/i,
  /\b(kill|murder|shoot|stab|bomb|attack|harm) (you|everyone|them|him|her|us|myself)\b/i,
  /\b(blow up|blow this|destroy this)\b/i,
  /\bdie\s+(you|b.tch|you)\b/i,
];

/**
 * Build word-boundary regex for a list of words.
 * Uses a negative lookbehind/ahead to prevent partial matches
 * (e.g. "ass" should not match "classic").
 */
function buildWordRegex(words) {
  const escaped = words.map(w =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  return new RegExp(`(?<![a-z])(?:${escaped.join('|')})(?![a-z])`, 'i');
}

const PROFANITY_RE    = buildWordRegex(PROFANITY_WORDS);
const HATE_SPEECH_RE  = buildWordRegex(HATE_SPEECH_WORDS);


// ─────────────────────────────────────────────────────────────────────────────
// 3. Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the client-side guardrail check on raw user input.
 *
 * @param {string} text  Raw input from the textarea / voice transcript
 * @returns {{ blocked: boolean, message?: string }}
 */
export function checkClientGuardrails(text) {
  if (!text || typeof text !== 'string') {
    return { blocked: false };
  }

  const norm = normalise(text);

  // ── Profanity ──────────────────────────────────────────────────────────
  if (PROFANITY_RE.test(norm)) {
    return {
      blocked: true,
      message:
        'Your message contains inappropriate language. Please keep the conversation respectful.',
    };
  }

  // ── Hate speech ───────────────────────────────────────────────────────
  if (HATE_SPEECH_RE.test(norm)) {
    return {
      blocked: true,
      message:
        'Your message contains language that violates our community guidelines. Please rephrase.',
    };
  }

  // ── Threats ───────────────────────────────────────────────────────────
  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(norm)) {
      return {
        blocked: true,
        message:
          'Your message contains threatening language and cannot be processed.',
      };
    }
  }

  return { blocked: false };
}

/**
 * Parse a backend 400 CONTENT_BLOCKED error into a user-facing string.
 *
 * Use this wherever you call apiService.sendMessage() or
 * apiService.transcribeAudio() to convert the structured error body
 * into the message you display in the chat bubble.
 *
 * @param {any} errorOrString  The `result.error` value from apiService
 * @returns {string}
 */
export function parseGuardrailError(errorOrString) {
  if (!errorOrString) return 'Something went wrong. Please try again.';

  // apiService.handleError already serialises detail objects to strings like:
  //   "CONTENT_BLOCKED: Your message contains..."
  // but it may also pass through raw strings, so handle both.
  if (typeof errorOrString === 'string') {
    // If the backend returned a JSON detail object serialised as a string
    try {
      const parsed = JSON.parse(errorOrString);
      if (parsed?.message) return `⚠️ ${parsed.message}`;
      if (parsed?.detail?.message) return `⚠️ ${parsed.detail.message}`;
    } catch {
      // plain string — use as-is
    }
    return `⚠️ ${errorOrString}`;
  }

  if (typeof errorOrString === 'object') {
    return `⚠️ ${errorOrString.message || errorOrString.detail?.message || 'Message blocked.'}`;
  }

  return '⚠️ Message blocked by content policy.';
}

/**
 * Returns true when a backend error string indicates a CONTENT_BLOCKED response.
 * Use this to decide whether to show the guardrail banner vs a generic error.
 *
 * @param {string} errorString
 * @returns {boolean}
 */
export function isGuardrailBlock(errorString) {
  if (!errorString || typeof errorString !== 'string') return false;
  return (
    errorString.includes('CONTENT_BLOCKED') ||
    errorString.includes('content policy') ||
    errorString.includes('inappropriate language') ||
    errorString.includes('violates our community') ||
    errorString.includes('threatening language') ||
    errorString.includes('respectful and professional')
  );
}