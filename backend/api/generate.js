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

Write a HIGH-RETENTION motivational script.

Topic: ${topic}

Length: 150–170 words.

IMPORTANT:
Return ONLY the final script.
Do NOT explain thinking.
No headings.
No emojis.
`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "user", content: scriptPrompt }
        ],
        temperature: 0.9,
        max_tokens: 600
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const script = response.data.choices[0].message.content.trim();

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
