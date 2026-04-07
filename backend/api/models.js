// backend/api/models.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1';
const TIMEOUT_MS = parseInt(process.env.GENERATE_TIMEOUT_MS || '30000', 10);

// Cache ListModels for 5 minutes
const MODEL_CACHE_TTL_MS = parseInt(process.env.GEMINI_MODEL_CACHE_TTL_MS || '300000', 10);
let modelCache = { list: [], ts: 0 };

// GET /api/gemini-models -> raw supported models for this key
router.get('/gemini-models', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Missing GEMINI_API_KEY on server'
    });
  }
  try {
    const models = await listGeminiModels();
    const simple = models.map((m) => ({
      name: m.name, // e.g. "models/gemini-2.5-flash"
      shortName: shortModelName(m.name),
      methods: m.supportedGenerationMethods || [],
      inputTokenLimit: m.inputTokenLimit,
      outputTokenLimit: m.outputTokenLimit
    }));
    return res.json({ success: true, count: simple.length, models: simple });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error('GEMINI LIST ERROR:', status, data || err.message);
    return res.status(500).json({
      success: false,
      error: data?.error?.message || err.message || 'Failed to list models'
    });
  }
});

// GET /api/gemini-models/capable -> only models that support generateContent, sorted (flash > pro > latest)
router.get('/gemini-models/capable', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'Missing GEMINI_API_KEY on server'
    });
  }
  try {
    const list = await listGeminiModels();
    const capable = list
      .filter(supportsGenerateContent)
      .map((m) => ({
        name: m.name,
        shortName: shortModelName(m.name),
        methods: m.supportedGenerationMethods || [],
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
        score: scoreModel(shortModelName(m.name))
      }))
      .sort((a, b) => b.score - a.score);

    return res.json({ success: true, count: capable.length, models: capable });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error('GEMINI LIST ERROR:', status, data || err.message);
    return res.status(500).json({
      success: false,
      error: data?.error?.message || err.message || 'Failed to list capable models'
    });
  }
});

// Helpers
async function listGeminiModels() {
  const fresh = Date.now() - modelCache.ts < MODEL_CACHE_TTL_MS;
  if (modelCache.list.length && fresh) return modelCache.list;

  const url = `${GEMINI_API_BASE}/models?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await axios.get(url, { timeout: TIMEOUT_MS });
  const models = Array.isArray(res.data?.models) ? res.data.models : [];
  modelCache = { list: models, ts: Date.now() };
  return models;
}

function supportsGenerateContent(m) {
  return Array.isArray(m?.supportedGenerationMethods) &&
         m.supportedGenerationMethods.includes('generateContent');
}

function shortModelName(full) {
  return String(full || '').split('/').pop();
}

function scoreModel(shortName) {
  let s = 0;
  if (/flash/i.test(shortName)) s += 100;
  if (/pro/i.test(shortName)) s += 90;
  if (/latest/i.test(shortName)) s += 10;
  if (/2\.5|1\.5/i.test(shortName)) s += 5;
  return s;
}

module.exports = router;
