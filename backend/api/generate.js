const express = require('express');
const router = express.Router();
const axios = require('axios');

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

router.post('/generate-script', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  try {
    const scriptPrompt = `
You are a viral YouTube Shorts scriptwriter.

Write a high-retention motivational script about: ${topic}

Length: 150–170 words.

Rules:
- First sentence short and punchy.
- Show internal struggle.
- Shift perspective in the middle.
- Build emotional intensity.
- End with a bold mic-drop line.
- No emojis.
- No headings.
- Return only the script.
`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "user", content: scriptPrompt }
        ],
        temperature: 0.9,
        max_tokens: 300
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const script =
      response.data.choices?.[0]?.message?.content?.trim() || "";

    if (!script) {
      return res.status(500).json({
        success: false,
        error: "Model returned empty script"
      });
    }

    res.json({
      success: true,
      script
    });

  } catch (error) {
    console.error("GROQ ERROR:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;
