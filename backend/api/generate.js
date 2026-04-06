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

    /* ================= SCRIPT ================= */

    const scriptPrompt = `
You are a viral YouTube Shorts scriptwriter.

Write a HIGH-RETENTION motivational script.

Topic: ${topic}

Length: 150–170 words.

IMPORTANT:
Return ONLY the final script.
No reasoning.
No explanations.
No headings.
No emojis.

Structure:
- First sentence short and punchy.
- Show internal struggle.
- Shift perspective unexpectedly in the middle.
- Build emotional intensity.
- End with a bold mic-drop line.

Avoid clichés like "believe in yourself" or "never give up."
`;

    const scriptResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: scriptPrompt }],
        temperature: 0.9,
        max_tokens: 300,
        reasoning: { effort: "none" }
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const script =
      scriptResponse.data.choices[0].message.content.trim();

    /* ================= TITLES ================= */

    const titlePrompt = `
Based on this script:

${script}

Generate 12 HIGH-CTR YouTube Shorts titles.

Rules:
- Max 60 characters
- Create curiosity gap
- Emotional tension
- No emojis
- No hashtags
- Each title must feel psychologically different
Return only the titles, one per line.
`;

    const titleResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: titlePrompt }],
        temperature: 0.9,
        max_tokens: 250,
        reasoning: { effort: "none" }
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const titles = titleResponse.data.choices[0].message.content
      .split("\n")
      .map(t => t.trim())
      .filter(t => t.length > 5);

    /* ================= DESCRIPTION ================= */

    const descriptionPrompt = `
Write a YouTube Shorts description for this script:

${script}

- 3–4 emotional lines
- Include keywords naturally: mindset, discipline, growth, success
- Add soft call to action
- No emojis
- No hashtags
Return only the description.
`;

    const descriptionResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: descriptionPrompt }],
        temperature: 0.9,
        max_tokens: 200,
        reasoning: { effort: "none" }
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const description =
      descriptionResponse.data.choices[0].message.content.trim();

    /* ================= HASHTAGS ================= */

    const hashtagPrompt = `
Generate 12 YouTube Shorts hashtags for this motivational script.

- Mix broad and niche
- Include #Shorts
- No repetition
- Return in one line separated by spaces
`;

    const hashtagResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: hashtagPrompt }],
        temperature: 0.9,
        max_tokens: 150,
        reasoning: { effort: "none" }
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const hashtags =
      hashtagResponse.data.choices[0].message.content.trim();

    /* ================= FINAL RESPONSE ================= */

    res.json({
      success: true,
      script,
      titles: titles.slice(0, 12),
      description,
      hashtags
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
