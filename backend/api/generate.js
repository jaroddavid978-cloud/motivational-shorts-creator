const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/generate-script", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: `Write a 120-150 word motivational script about ${topic}.`
          }
        ],
        temperature: 0.8,
        max_tokens: 200
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const script =
      response.data.choices?.[0]?.message?.content || "";

    return res.json({
      success: true,
      script
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "API call failed"
    });
  }
});

module.exports = router;
