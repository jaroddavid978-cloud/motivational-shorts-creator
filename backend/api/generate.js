// backend/api/generate.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Simple test endpoint
router.get('/test-gemini', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.json({ success: false, error: 'No API key' });
  }
  
  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
    const response = await axios.get(testUrl, { timeout: 10000 });
    res.json({ success: true, modelsFound: response.data?.models?.length || 0 });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Main generate endpoint - NO RETRIES, NO RATE LIMITING
router.post('/generate-script', async (req, res) => {
  const topic = (req.body?.topic || '').trim();

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ success: false, error: 'Missing API key' });
  }

  console.log(`Generating for: ${topic}`);

  const prompt = `Create a motivational YouTube Short about "${topic}". Return ONLY valid JSON. No markdown.

{
  "script": "Write 135-155 words. Start with a hook. One sentence per line. End with call to action.",
  "titles": {
    "a": "Title 1 under 55 chars",
    "b": "Title 2 under 55 chars", 
    "c": "Title 3 under 55 chars"
  },
  "description": "Short description under 170 chars",
  "hashtags": ["#shorts", "#motivation", "#${topic.replace(/[^a-z]/gi, '').toLowerCase()}"]
}`;

  try {
    // Use gemini-2.0-flash directly - no model discovery
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 800
      }
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Response received, length:', responseText.length);
    
    // Clean and parse JSON
    let cleanJson = responseText.trim();
    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '');
    
    const parsed = JSON.parse(cleanJson);
    
    if (!parsed.script) {
      throw new Error('No script in response');
    }

    return res.json({
      success: true,
      script: parsed.script,
      titleA: parsed.titles?.a || `Unlock Your ${topic}`,
      titleB: parsed.titles?.b || `Master ${topic} Now`,
      titleC: parsed.titles?.c || `Stop Wasting Time`,
      description: parsed.description || `Quick motivation on ${topic}. Save this.`,
      hashtags: parsed.hashtags || ['#shorts', '#motivation'],
      wordCount: parsed.script.split(/\s+/).length
    });
    
  } catch (err) {
    console.error('Error:', err.message);
    
    // Return a fallback response so user gets something
    return res.json({
      success: true,
      script: `Stop waiting for the perfect moment to master ${topic}. The only person stopping you is the one in the mirror. Take one small action today. Just one. Then another tomorrow. Your future self will thank you. Start now.`,
      titleA: `Unlock Your ${topic} Potential`,
      titleB: `Master ${topic} in 60 Seconds`,
      titleC: `Stop Procrastinating on ${topic}`,
      description: `Quick motivation on ${topic}. Watch till the end.`,
      hashtags: ['#shorts', '#motivation', `#${topic.replace(/[^a-z]/gi, '').toLowerCase()}`],
      wordCount: 45,
      fallback: true
    });
  }
});

module.exports = router;
