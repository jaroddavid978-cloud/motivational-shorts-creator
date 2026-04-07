// backend/api/generate.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const TIMEOUT_MS = parseInt(process.env.GROQ_TIMEOUT_MS || '30000', 10);

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

  const userPrompt = `You are helping create a 55–60s motivational YouTube Short.

Return ONLY strict JSON (no markdown, no commentary).

Fields:
- "script": 120–150 words motivational monologue about "${topic}". No emojis/hashtags.
- "titles": { "a": "...", "b": "...", "c": "..." } — punchy titles under 60 chars.
- "description": 1–2 lines under 200 chars.
- "hashtags": array of 8–12 relevant hashtags starting with # (include a few general tags like #motivation and #shorts).

Example:
{"script":"...","titles":{"a":"...","b":"...","c":"..."},"description":"...","hashtags":["#motivation","..."]}`;

  try {
    const groqRes = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        temperature: 0.8,
        max_tokens: 400,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that returns strictly formatted JSON when asked.' },
          { role: 'user', content: userPrompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: TIMEOUT_MS
      }
    );

    const raw = groqRes.data?.choices?.[0]?.message?.content || '';
    let parsed = safeJsonParse(raw);

    let script, titles, description, hashtags;

    if (parsed) {
      script = String(parsed.script || '').trim();
      titles = parsed.titles || {};
      description = String(parsed.description || '').trim();
      hashtags = parsed.hashtags;
    }

    // Fallbacks if the model returns plain text or misses fields
    if (!script) script = raw.trim();
    if (!script) {
      return res.status(502).json({ success: false, error: 'Empty response from model' });
    }

    const titleA = titles?.a || `The Power of ${toTitle(topic)}`;
    const titleB = titles?.b || `${toTitle(topic)}: Start Today`;
    const titleC = titles?.c || `Why ${toTitle(topic)} Matters`;

    if (!Array.isArray(hashtags)) {
      hashtags = makeHashtags(topic);
    } else {
      hashtags = normalizeHashtags(hashtags);
    }

    if (!description) {
      description = `A fast, focused boost on ${topic}—a reminder to stay consistent and keep moving.`;
    }

    const wordCount = countWords(script);

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

// Helpers
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

function countWords(txt) {
  return (String(txt || '').trim().match(/\b\w+\b/g) || []).length;
}

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
    '#motivation', '#inspiration', '#mindset', '#success',
    '#discipline', '#goals', '#selfimprovement', '#growth',
    '#focus', '#shorts'
  ];
  const t = String(topic || '').replace(/[^\w]+/g, '');
  if (t) base.unshift(`#${t.toLowerCase()}`);
  return normalizeHashtags(base);
}

module.exports = router;
