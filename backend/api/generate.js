// backend/api/generate.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============== Config ===============
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'; // Changed to v1beta for better compatibility

const ENV_PREFERRED_MODEL = (process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim(); // Default to a reliable model

const TIMEOUT_MS = parseInt(process.env.GENERATE_TIMEOUT_MS || '45000', 10); // Increased timeout

const MODEL_CACHE_TTL_MS = parseInt(process.env.GEMINI_MODEL_CACHE_TTL_MS || '300000', 10);
let modelCache = { list: [], ts: 0 };

const STORE_PATH = process.env.RECENT_STORE_PATH || path.join(__dirname, '..', 'data', 'recent.json');
const MAX_STORE_ITEMS = parseInt(process.env.RECENT_STORE_LIMIT || '250', 10);

const TARGET_MIN_WORDS = 135;
const TARGET_MAX_WORDS = 155;
const SCRIPT_SIMILARITY_THRESHOLD = 0.82;
const DEBUG_MODEL_PREVIEW = String(process.env.DEBUG_MODEL_PREVIEW || '').toLowerCase() === 'true';

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

// ======================================
router.post('/generate-script', async (req, res) => {
  const topic = (req.body?.topic || '').trim();

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Server misconfigured: missing GEMINI_API_KEY'
    });
  }

  const avoidTitles = recent.titles.slice(0, 20);
  const avoidDescs = recent.descriptions.slice(0, 20);
  const avoidScriptPreviews = recent.scripts.slice(0, 15).map((s) => s.preview);

  // Simplified prompt to ensure JSON response
  const userPrompt = `Create content for YouTube Short about "${topic}". Return ONLY valid JSON.

{
  "script": "Write a motivational script (135-155 words). Start with a hook. One sentence per line. End with a CTA. No emojis, no hashtags.",
  "titles": {
    "a": "Title 1 under 55 chars",
    "b": "Title 2 under 55 chars", 
    "c": "Title 3 under 55 chars"
  },
  "description": "Short description under 170 chars",
  "hashtags": ["#shorts", "#motivation", "#${topic.replace(/[^a-z]/gi, '').toLowerCase()}"]
}

Previous titles to avoid: ${JSON.stringify(avoidTitles.slice(0, 5))}`;

  try {
    // Try multiple model attempts with fallback
    let parsed = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!parsed && attempts < maxAttempts) {
      attempts++;
      console.log(`Generation attempt ${attempts} for topic: "${topic}"`);
      
      let genText = await callGeminiWithFallback(userPrompt, { 
        temperature: 0.8, 
        maxOutputTokens: 1000 
      });
      
      if (!genText) {
        console.log(`Attempt ${attempts} - No response from Gemini`);
        continue;
      }
      
      parsed = safeJsonParse(genText);
      
      if (!parsed && attempts === 1) {
        // Try with more explicit JSON instruction
        const strictPrompt = `You are a JSON API. Respond ONLY with a valid JSON object. No other text.

{
  "script": "135-155 word motivational script about ${topic}. Hook first line. One sentence per line. No markdown.",
  "titles": {"a": "short title", "b": "another title", "c": "third title"},
  "description": "brief description under 170 chars",
  "hashtags": ["#shorts", "#motivation", "#${topic.replace(/[^a-z]/gi, '').toLowerCase()}"]
}`;
        genText = await callGeminiWithFallback(strictPrompt, { temperature: 0.7, maxOutputTokens: 1000 });
        parsed = safeJsonParse(genText);
      }
    }

    if (!parsed || !parsed.script) {
      console.error('Failed to get valid response after attempts');
      return res.status(502).json({ 
        success: false, 
        error: 'Empty or malformed model response',
        details: 'Could not generate valid content after multiple attempts'
      });
    }

    // Extract and validate fields
    let script = String(parsed.script || '').trim();
    let titles = parsed.titles || {};
    let description = String(parsed.description || '').trim();
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];

    // Validate and fix script length
    let wordCount = countWords(script);
    if (wordCount < 50) {
      // Script too short, generate fallback
      script = generateFallbackScript(topic);
      wordCount = countWords(script);
    }

    // Ensure titles exist
    let titleA = sanitizeTitle(titles?.a) || fallbackTitle(topic, 'Unlock');
    let titleB = sanitizeTitle(titles?.b) || fallbackTitle(topic, 'This Changes');
    let titleC = sanitizeTitle(titles?.c) || fallbackTitle(topic, 'Stop Doing');

    // Ensure description exists
    if (!description || description.length < 10) {
      description = sanitizeDescription(`Quick motivation on ${topic}. Save this for later.`);
    }

    // Ensure hashtags exist
    if (!hashtags.length) {
      hashtags = makeHashtags(topic);
    }

    // Store for deduplication
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
    
    // Return fallback response instead of error
    return res.json({
      success: true,
      script: generateFallbackScript(topic),
      titleA: fallbackTitle(topic, 'Unlock Your'),
      titleB: fallbackTitle(topic, 'Master'),
      titleC: fallbackTitle(topic, 'Stop Wasting'),
      description: `Quick motivation on ${topic}. Watch till the end.`,
      hashtags: makeHashtags(topic),
      wordCount: 140,
      fallback: true
    });
  }
});

// ======================================
// Improved Gemini helper with better error handling

async function callGeminiWithFallback(prompt, config = {}) {
  const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
  
  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      const result = await callGeminiModel(model, prompt, config);
      if (result && result.trim().length > 0) {
        console.log(`Success with model: ${model}`);
        return result;
      }
    } catch (e) {
      console.log(`Model ${model} failed:`, e.message);
    }
  }
  
  return null;
}

async function callGeminiModel(modelName, prompt, config = {}) {
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: config.temperature || 0.8,
      maxOutputTokens: config.maxOutputTokens || 800,
      topP: 0.9
    }
  };

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: TIMEOUT_MS
  });

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  
  return text.trim();
}

// Fallback function for when API fails
function generateFallbackScript(topic) {
  const hooks = [
    `Most people fail at ${topic} because they don't understand this one thing.`,
    `Stop waiting for the perfect moment to start your ${topic} journey.`,
    `Here's the truth about ${topic} nobody wants to tell you.`
  ];
  
  const tips = [
    `You have more control than you think.`,
    `Small daily actions create massive results over time.`,
    `Your mindset determines your success rate.`,
    `The only limit is the one you set for yourself.`,
    `Start before you feel ready.`
  ];
  
  const cta = [
    `Save this video and watch it every morning.`,
    `Share this with someone who needs to hear it.`,
    `Start implementing these principles today.`
  ];
  
  const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
  const randomTips = tips.sort(() => 0.5 - Math.random()).slice(0, 4);
  const randomCta = cta[Math.floor(Math.random() * cta.length)];
  
  return `${randomHook}\n\n${randomTips.join('\n\n')}\n\n${randomCta}`;
}

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Try to extract JSON from markdown code blocks
  let s = text.trim();
  const jsonMatch = s.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    s = jsonMatch[1];
  }
  
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
    console.log('Attempted to parse:', s.substring(0, 200));
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
