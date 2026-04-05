const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY missing.");
}

/* =====================================
   ✅ LIST AVAILABLE MODELS (REST)
===================================== */
router.get('/list-models', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    const data = await response.json();

    res.json(data);

  } catch (error) {
    console.error("MODEL LIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =====================================
   ✅ GENERATE SCRIPT (REST)
===================================== */

router.post('/generate-script', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  try {

    const prompt = `
Create a high-retention motivational YouTube Shorts script.

Topic: ${topic}
Length: 150-170 words
No emojis.
No formatting.
Strong hook.
Emotional build.
Powerful ending.
Return only the script.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates) {
      return res.status(500).json({
        success: false,
        error: data
      });
    }

    const script = data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      script
    });

  } catch (error) {
    console.error("GENERATION ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
