// backend/api/generate.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============== Config ===============
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const TIMEOUT_MS = parseInt(process.env.GROQ_TIMEOUT_MS || '30000', 10);

// Where to keep recent outputs to reduce repetition (free, file-based)
const STORE_PATH =
  process.env.RECENT_STORE_PATH ||
  path.join(__dirname, '..', 'data', 'recent.json');
const MAX_STORE_ITEMS = parseInt(process.env.RECENT_STORE_LIMIT || '250', 10);

// Word count target for ~55–60s VO
const TARGET_MIN_WORDS = 135;
const TARGET_MAX_WORDS = 155;

// Dedupe thresholds (token overlap)
const SCRIPT_SIMILARITY_THRESHOLD = 0.82;

// ======================================
// Simple persistent store to avoid repeats
let recent = loadStore();

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const txt = fs.readFileSync(STORE_PATH, 'utf8');
      const obj = JSON.parse(txt);
      return {
        scripts: Array.isArray(obj.scripts) ? obj.scripts : [],
        titles: Array.isArray(obj.titles) ? obj.titles : [],
        descriptions: Array.isArray(obj.descriptions) ? obj.descriptions : []
      };
    }
  } catch (_) {}
  return { scripts: [], titles: [], descriptions: [] };
}

function saveStore() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(recent, null, 2), 'utf8');
  } catch (e) {
    // Non-fatal on platforms with read-only FS
    console.warn('Could not persist recent store:', e.message);
  }
}

function normalizeForCompare(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[_*`"'’“”‘’~^()[\]{}:;.,!?/\\|@#$%^&+=<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textHash(s) {
  return crypto.createHash('sha256').update(normalizeForCompare(s)).digest('hex');
}

function tokenSet(s) {
  return new Set(normalizeForCompare(s).split(' ').filter(Boolean));
}

function jaccard(aText, bText) {
  const a = tokenSet(aText);
  const b = tokenSet(bText);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter;
  return inter / uni;
}

function isNearDuplicateScript(candidate) {
  const cand = normalizeForCompare(candidate);
  for (const s of recent.scripts) {
    const sim = jaccard(cand, s.normalized || '');
    if (sim >= SCRIPT_SIMILARITY_THRESHOLD) return true;
  }
  return false;
}

function isDuplicateTitleOrDesc(candidate, list) {
  const cand = normalizeForCompare(candidate);
  return list.some((x) => normalizeForCompare(x) === cand);
}

function pushScript(script) {
  const entry = {
    hash: textHash(script),
    preview: normalizeForCompare(script).slice(0, 160),
    normalized: normalizeForCompare(script),
    ts: Date.now()
  };
  if (!recent.scripts.some((s) => s.hash === entry.hash)) {
    recent.scripts.unshift(entry);
    if (recent.scripts.length > MAX_STORE_ITEMS) recent.scripts.length = MAX_STORE_ITEMS;
  }
}

function pushTitle(title) {
  const t = String(title || '').trim();
  if (!t) return;
  if (!recent.titles.some((x) => normalizeForCompare(x) === normalizeForCompare(t))) {
    recent.titles.unshift(t);
    if (recent.titles.length > MAX_STORE_ITEMS) recent.titles.length = MAX_STORE_ITEMS;
  }
}

function pushDescription(description) {
  const d = String(description || '').trim();
  if (!d) return;
  if (!recent.descriptions.some((x) => normalizeForCompare(x) === normalizeForCompare(d))) {
    recent.descriptions.unshift(d);
    if (recent.descriptions.length > MAX_STORE_ITEMS) recent.descriptions.length = MAX_STORE_ITEMS;
  }
}

// ======================================
// HTTP Route
router.post('/generate-script', async (req, res) => {
  const topic = (req.body?.topic || '').trim();

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Server misconfigured: missing GROQ_API_KEY'
    });
  }

  // Keep avoid lists tight to save tokens
  const avoidTitles = recent.titles.slice(0, 20);
  const avoidDescs = recent.descriptions.slice(0, 20);
  const avoidScriptPreviews = recent.scripts.slice(0, 15).map((s) => s.preview);

  // Main prompt: high-retention script + metadata
  const userPrompt = `You create HIGH-RETENTION YouTube Shorts content for the topic "${topic}".

Return ONLY strict JSON (no markdown, no extra text).

Fields:
- "script": 135–155 words, optimized for a 55–60 second voiceover.
  Style rules:
  - Line 1: a sharp HOOK sentence (8–14 words) using command/tension/contrast.
  - Talk to "you". Short, punchy sentences. Vary cadence.
  - Put each sentence on a new line (for cuts).
  - Include one vivid micro-example (1–2 lines).
  - No emojis, no hashtags, no lists/numbers.
  - Final line: crisp identity-shift / call-to-action (6–12 words).
- "titles": { "a": "...", "b": "...", "c": "..." }
  Each title must be ≤55 chars, different from each other, curiosity/promise-driven, no clickbait like "You won't believe".
- "description": 1–2 lines, ≤170 chars, includes a soft CTA ("save this", "watch till the end"). No hashtags/emojis.
- "hashtags": array of 10–12 tags mixing broad + niche. Include #shorts, #motivation and one topic-specific tag (e.g., #${toTag(topic)}).

Avoid repetition:
- Do NOT repeat or closely paraphrase these prior items.
- Prior titles: ${JSON.stringify(avoidTitles)}
- Prior descriptions: ${JSON.stringify(avoidDescs)}
- Themes/sentences to avoid: ${JSON.stringify(avoidScriptPreviews)}

Output format ONLY:
{"script":"...","titles":{"a":"...","b":"...","c":"..."},"description":"...","hashtags":["#shorts","..."]}`;

  try {
    // 1) Generate
    const gen = await callGroq([
      { role: 'system', content: 'You write tight, high-retention short-form content and return strict JSON.' },
      { role: 'user', content: userPrompt }
    ]);

    const raw = gen?.choices?.[0]?.message?.content || '';
    const parsed = safeJsonParse(raw);
    if (!parsed || !parsed.script) {
      return res.status(502).json({ success: false, error: 'Empty or malformed model response' });
    }

    // Extract + normalize
    let script = String(parsed.script || '').trim();
    let titles = parsed.titles || {};
    let description = String(parsed.description || '').trim();
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];

    // Validate word count; refine once if out of range
    let wordCount = countWords(script);
    if (wordCount < TARGET_MIN_WORDS || wordCount > TARGET_MAX_WORDS) {
      const refine = await callGroq([
        { role: 'system', content: 'You rewrite content to a target word count and return strict JSON.' },
        {
          role: 'user',
          content: `Refine the script to ${TARGET_MIN_WORDS}-${TARGET_MAX_WORDS} words. Keep the same meaning and style rules.
Return JSON only: {"script":"..."}.

Original script:
${script}`
        }
      ], { max_tokens: 260 });

      const raw2 = refine?.choices?.[0]?.message?.content || '';
      const parsed2 = safeJsonParse(raw2);
      if (parsed2?.script) {
        script = String(parsed2.script).trim();
        wordCount = countWords(script);
      }
    }

    // Titles handling: ensure uniqueness + ≤55 chars and avoid prior ones
    let titleA = sanitizeTitle(titles?.a);
    let titleB = sanitizeTitle(titles?.b);
    let titleC = sanitizeTitle(titles?.c);

    // Regenerate titles/desc once if duplicates or missing
    const titlesMissing = !titleA || !titleB || !titleC;
    const titlesClash =
      hasInternalTitleClash([titleA, titleB, titleC]) ||
      [titleA, titleB, titleC].some((t) => isDuplicateTitleOrDesc(t, recent.titles));

    if (titlesMissing || titlesClash || !description) {
      const meta = await regenerateMeta(topic, avoidTitles, avoidDescs);
      titleA = sanitizeTitle(meta.titleA || titleA || fallbackTitle(topic, 'Unlock'));
      titleB = sanitizeTitle(meta.titleB || titleB || fallbackTitle(topic, 'This Changes'));
      titleC = sanitizeTitle(meta.titleC || titleC || fallbackTitle(topic, 'Stop Doing'));
      description = sanitizeDescription(meta.description || description || defaultDescription(topic));
    } else {
      // Basic sanitation
      description = sanitizeDescription(description || defaultDescription(topic));
    }

    // Ensure titles differ from store after regen
    [titleA, titleB, titleC] = ensureThreeDistinct([titleA, titleB, titleC], topic, avoidTitles);

    // Hashtags normalize to 10–12
    if (!Array.isArray(hashtags) || hashtags.length < 8) {
      hashtags = makeHashtags(topic);
    } else {
      hashtags = normalizeHashtags(hashtags);
      if (hashtags.length < 10) {
        const base = makeHashtags(topic);
        for (const h of base) {
          if (!hashtags.some((x) => x.toLowerCase() === h.toLowerCase())) hashtags.push(h);
          if (hashtags.length >= 12) break;
        }
      } else if (hashtags.length > 12) {
        hashtags = hashtags.slice(0, 12);
      }
    }

    // Final dedupe check on script; if too similar, request a variation once
    if (isNearDuplicateScript(script)) {
      const vary = await callGroq([
        { role: 'system', content: 'You vary content while preserving meaning and return strict JSON.' },
        {
          role: 'user',
          content: `Produce a fresh variation of this script about "${topic}" with the SAME constraints as before.
Avoid repeating sentences or structure. Keep ${TARGET_MIN_WORDS}-${TARGET_MAX_WORDS} words.
Return JSON only: {"script":"..."}.

Original:
${script}`
        }
      ], { max_tokens: 320 });

      const raw3 = vary?.choices?.[0]?.message?.content || '';
      const parsed3 = safeJsonParse(raw3);
      if (parsed3?.script) {
        script = String(parsed3.script).trim();
        wordCount = countWords(script);
      }
    }

    // Push to store
    pushScript(script);
    pushTitle(titleA);
    pushTitle(titleB);
    pushTitle(titleC);
    pushDescription(description);
    saveStore();

    return res.json({
      success: true,
      script,
      titleA,
      titleB,
      titleC,
      description,
      hashtags,
      wordCount
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error('GROQ ERROR:', status, data || err.message);

    return res.status(500).json({
      success: false,
      error:
        data?.error?.message ||
        data?.message ||
        err.message ||
        'Generation failed',
      code: data?.error?.type || err.code || 'unknown_error'
    });
  }
});

// ======================================
// LLM helpers
async function callGroq(messages, opts = {}) {
  const payload = {
    model: MODEL,
    temperature: opts.temperature ?? 0.85,
    max_tokens: opts.max_tokens ?? 520,
    messages
  };
  const res = await axios.post(GROQ_URL, payload, {
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: TIMEOUT_MS
  });
  return res.data;
}

async function regenerateMeta(topic, avoidTitles, avoidDescs) {
  try {
    const metaPrompt = `Generate only titles and description for a high-retention YouTube Short on "${topic}".

Return JSON only:
{"titles":{"a":"...","b":"...","c":"..."},"description":"..."}

Rules:
- Titles: ≤55 chars, curiosity/promise-driven, distinct from each other and from this list: ${JSON.stringify(avoidTitles)}.
- Description: 1–2 lines, ≤170 chars, soft CTA, distinct from: ${JSON.stringify(avoidDescs)}.
- No emojis or hashtags.`;

    const out = await callGroq(
      [
        { role: 'system', content: 'You craft compelling titles/descriptions and return strict JSON.' },
        { role: 'user', content: metaPrompt }
      ],
      { max_tokens: 220, temperature: 0.9 }
    );

    const raw = out?.choices?.[0]?.message?.content || '';
    const p = safeJsonParse(raw) || {};
    const titles = p.titles || {};
    return {
      titleA: sanitizeTitle(titles.a),
      titleB: sanitizeTitle(titles.b),
      titleC: sanitizeTitle(titles.c),
      description: sanitizeDescription(p.description)
    };
  } catch {
    return {
      titleA: fallbackTitle(topic, 'Unlock'),
      titleB: fallbackTitle(topic, 'This Changes'),
      titleC: fallbackTitle(topic, 'Stop Doing'),
      description: defaultDescription(topic)
    };
  }
}

// ======================================
// Validation/sanitization helpers
function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null;
  let s = text.trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  try { return JSON.parse(s); } catch { return null; }
}

function toTitle(str) {
  return String(str || '')
    .split(/[\s_-]+/)
    .map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')
    .join(' ')
    .trim();
}

function toTag(str) {
  return String(str || '').replace(/[^\w]+/g, '').toLowerCase();
}

function countWords(txt) {
  return (String(txt || '').trim().match(/\b\w+\b/g) || []).length;
}

function sanitizeTitle(t) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  return s.length > 55 ? s.slice(0, 55).trim() : s;
}

function sanitizeDescription(d) {
  let s = String(d || '').replace(/[#💯🔥✨🚀✅]+/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length > 170) s = s.slice(0, 170).trim();
  return s;
}

function fallbackTitle(topic, verb) {
  const t = toTitle(topic);
  const out = `${verb} ${t}`;
  return sanitizeTitle(out);
}

function defaultDescription(topic) {
  return sanitizeDescription(`Quick hit on ${topic}—watch till the end and save this.`);
}

function hasInternalTitleClash(list) {
  const clean = list.map((t) => normalizeForCompare(t)).filter(Boolean);
  const set = new Set(clean);
  return set.size !== clean.length;
}

function ensureThreeDistinct(list, topic, avoid) {
  let [a, b, c] = list.map(sanitizeTitle);

  const used = new Set(avoid.map((x) => normalizeForCompare(x)));
  const seen = new Set();

  function uniq(t, fallbackVerb) {
    let x = sanitizeTitle(t);
    let key = normalizeForCompare(x);
    let tries = 0;
    while ((!x || used.has(key) || seen.has(key)) && tries < 3) {
      x = fallbackTitle(topic, tries === 0 ? fallbackVerb : (fallbackVerb + ' More'));
      key = normalizeForCompare(x);
      tries++;
    }
    seen.add(key);
    used.add(key);
    return x;
  }

  a = uniq(a, 'Unlock');
  b = uniq(b, 'This Changes');
  c = uniq(c, 'Stop Doing');

  return [a, b, c];
}

// ======================================
// Hashtags helpers
function normalizeHashtags(arr) {
  const out = [];
  const seen = new Set();
  for (const t of arr) {
    const clean = String(t || '').trim();
    if (!clean) continue;
    const tag = clean.startsWith('#') ? clean : `#${clean}`;
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out.slice(0, 12);
}

function makeHashtags(topic) {
  const base = [
    '#shorts', '#motivation', '#mindset', '#success',
    '#discipline', '#goals', '#selfimprovement', '#growth',
    '#focus', '#inspiration'
  ];
  const t = toTag(topic);
  if (t) base.unshift(`#${t}`);
  return normalizeHashtags(base);
}

module.exports = router;
