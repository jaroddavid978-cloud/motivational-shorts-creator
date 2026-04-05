const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing.");
}

const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY
});

router.post('/generate-script', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const prompt = `
Create a HIGH-RETENTION YouTube Shorts motivational script.

Topic: ${topic}
Duration: 40-60 seconds
Word count: 150-170 words

Rules:
- Strong hook
- Emotional build
- Mic-drop ending
- No emojis
- No headings
- Return only the script
`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    const script = response.text;

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
