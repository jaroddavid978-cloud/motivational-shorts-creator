const express = require("express");
const router = express.Router();
const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

router.post("/generate-script", async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: "Topic required" });
  }

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: `Write a clear 120-150 word motivational script about ${topic}. Return only the script text.`
          }
        ],
        temperature: 0.8,
        max_tokens: 180   // ✅ small enough to avoid reasoning overrun
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    const choice = response.data?.choices?.[0];

    if (!choice || !choice.message || !choice.message.content) {
      return res.status(500).json({
        success: false,
        error: "Invalid model response"
      });
    }

    const script = choice.message.content.trim();

    if (script.length < 20) {
      return res.status(500).json({
        success: false,
        error: "Model returned empty content"
      });
    }

    return res.json({
      success: true,
      script
    });

  } catch (err) {
    console.error("PRODUCTION ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      error: "Generation failed"
    });
  }
});

module.exports = router;
