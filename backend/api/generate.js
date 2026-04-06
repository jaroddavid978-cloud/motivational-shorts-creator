const express = require("express");
const router = express.Router();
const axios = require("axios");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

router.post("/generate-script", async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({
      success: false,
      error: "Topic is required"
    });
  }

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Write a 120-150 word motivational script about ${topic}. Return only the script text.`
          }
        ],
        temperature: 0.8,
        max_tokens: 200
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    const script =
      response.data?.choices?.[0]?.message?.content?.trim();

    if (!script) {
      return res.status(500).json({
        success: false,
        error: "Model returned empty response"
      });
    }

    return res.json({
      success: true,
      script
    });

  } catch (err) {
    console.error("GROQ ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      error: "Generation failed"
    });
  }
});

module.exports = router;
