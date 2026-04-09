// backend/api/generate.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============== Config ===============
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1';

const TIMEOUT_MS = parseInt(process.env.GENERATE_TIMEOUT_MS || '45000', 10);

const STORE_PATH = process.env.RECENT_STORE_PATH || path.join(__dirname, '..', 'data', 'recent.json');
const MAX_STORE_ITEMS = parseInt(process.env.RECENT_STORE_LIMIT || '250', 10);

const TARGET_MIN_WORDS = 135;
const TARGET_MAX_WORDS = 155;
const SCRIPT_SIMILARITY_THRESHOLD = 0.82;

// ======================================
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

// =============== TEST ENDPOINT ===============
router.get('/test-gemini', async (req, res) => {
  console.log('=== TESTING GEMINI API ===');
  console.log('API Key exists?', GEMINI_API_KEY ? 'YES' : 'NO');
  console.log('API Key length:', GEMINI_API_KEY?.length || 0);
  
  if (!GEMINI_API_KEY) {
    return res.json({ 
      success: false, 
      error: 'No API key found. Set GEMINI_API_KEY in Render environment variables.' 
    });
  }
  
  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
    const response = await axios.get(testUrl, { timeout: 10000 });
    
    res.json({
      success: true,
      apiKeyPresent: true,
      modelsFound: response.data?.models?.length || 0,
      firstFewModels: response.data?.models?.slice(0, 3).map(m => m.name)
    });
  } catch (error) {
    res.json({
      success: false,
      apiKeyPresent: true,
      error: error.message,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// =============== MAIN GENERATION ROUTE ===============
router.post('/generate-script', async (req, res) => {
  const topic = (req.body?.topic || '').trim();

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ success: false, error: 'Missing GEMINI_API_KEY' });
  }

  console.log(`🎬 Generating for topic: ${topic}`);

  const avoidTitles = recent.titles.slice(0, 20);
  const avoidDescs = recent.descriptions.slice(0, 20);
  const avoidScriptPreviews = recent.scripts.slice(0, 15).map((s) => s.preview);

  const userPrompt = `You create HIGH-RETENTION YouTube Shorts content for the topic "${topic}".

Return ONLY strict JSON (no markdown, no commentary, no code fences).

Fields:
- "script": 135–155 words, optimized for a 55–60 second voiceover.
  Style rules:
  - Line 1: a sharp HOOK sentence (8–14 words) using command/tension/contrast.
  - Talk to "you". Short, punchy sentences. Vary cadence.
  - Put each sentence on a new line (for fast jump cuts).
  - Include one vivid micro-example (1–2 lines).
  - No emojis, no hashtags, no bullet lists or numbering.
  - Final line: crisp identity-shift / call-to-action (6–12 words).
- "titles": { "a": "...", "b": "...", "c": "..." }
  Each title must be ≤55 chars, different from each other, curiosity/promise-driven, no clickbait like "You won't believe".
- "description": 1–2 lines, ≤170 chars, includes a soft CTA ("save this", "watch till the end"). No hashtags/emojis.
- "hashtags": array of 10–12 tags mixing broad + niche. Include #shorts, #motivation and one topic-specific tag.

Avoid repetition:
- Do NOT repeat or closely paraphrase these prior items.
- Prior titles: ${JSON.stringify(avoidTitles.slice(0, 5))}

Output format ONLY this JSON object:
{"script":"...","titles":{"a":"...","b":"...","c":"..."},"description":"...","hashtags":["#shorts","..."]}`;

  try {
    let genText = await callGeminiAuto(userPrompt, { temperature: 0.9, maxOutputTokens: 1000 });
    console.log('Raw Gemini response length:', genText?.length || 0);
    
    let parsed = safeJsonParse(genText);

    if (!parsed || !parsed.script) {
      console.log('Failed to parse JSON. First 300 chars:', genText?.substring(0, 300));
      return res.status(502).json({ success: false, error: 'Empty or malformed model response' });
    }

    let script = String(parsed.script || '').trim();
    let titles = parsed.titles || {};
    let description = String(parsed.description || '').trim();
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];

    let wordCount = countWords(script);

    let titleA = sanitizeTitle(titles?.a);
    let titleB = sanitizeTitle(titles?.b);
    let titleC = sanitizeTitle(titles?.c);

    if (!titleA || !titleB || !titleC) {
      titleA = titleA || fallbackTitle(topic, 'Unlock');
      titleB = titleB || fallbackTitle(topic, 'This Changes');
      titleC = titleC || fallbackTitle(topic, 'Stop Doing');
    }

    if (!description) {
      description = sanitizeDescription(`Quick hit on ${topic}—watch till the end and save this.`);
    }

    if (!hashtags.length) {
      hashtags = makeHashtags(topic);
    }

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
    console.error('GEMINI ERROR:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Generation failed'
    });
  }
});

// =============== FIXED GEMINI HELPERS ===============

async function getWorkingModel() {
  // Models that work with your API key (from your test)
  const workingModels = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  
  for (const model of workingModels) {
    try {
      const testUrl = `${GEMINI_API_BASE}/models/${model}?key=${GEMINI_API_KEY}`;
      await axios.get(testUrl, { timeout: 5000 });
      console.log(`✅ Using model: ${model}`);
      return model;
    } catch (e) {
      console.log(`⚠️ Model ${model} not available:`, e.response?.status);
    }
  }
  
  // Fallback to direct call without validation
  console.log('⚠️ Using fallback model: gemini-1.5-flash');
  return 'gemini-1.5-flash';
}

async function callGeminiAuto(text, cfg = {}) {
  const modelName = await getWorkingModel();
  return await callGeminiRaw(modelName, text, cfg);
}

async function callGeminiRaw(modelName, text, opts = {}) {
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.9,
      maxOutputTokens: opts.maxOutputTokens ?? 1000
    }
  };

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: TIMEOUT_MS
  });

  const textOut = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textOut) {
    const blockReason = response.data?.promptFeedback?.blockReason;
    throw new Error(`Empty Gemini response${blockReason ? ` (blocked: ${blockReason})` : ''}`);
  }
  
  return textOut;
}

// =============== HELPER FUNCTIONS ===============

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null;
  
  let s = text.trim();
  
  // Remove markdown code blocks
  s = s.replace(/^```(?:json)?\s*/i, '');
  s = s.replace(/\s*```$/i, '');
  
  // Find first { and last }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  
  try { 
    return JSON.parse(s); 
  } catch (e) {
    console.log('JSON parse error:', e.message);
    return null;
  }
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

function makeHashtags(topic) {
  const base = [
    '#shorts', '#motivation', '#mindset', '#success',
    '#discipline', '#goals', '#selfimprovement', '#growth',
    '#focus', '#inspiration'
  ];
  const t = toTag(topic);
  if (t && !base.includes(`#${t}`)) {
    base.unshift(`#${t}`);
  }
  return base.slice(0, 12);
}

module.exports = router;
