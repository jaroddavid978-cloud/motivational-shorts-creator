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
Write a 120–150 word motivational script about "${topic}".
Return only the script.
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

    // ✅ RETURN FULL RAW GROQ RESPONSE
    return res.json(response.data);

  } catch (error) {
    console.error("FULL GROQ ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;
