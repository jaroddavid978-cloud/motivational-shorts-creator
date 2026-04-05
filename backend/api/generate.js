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

    /* ================= SCRIPT PROMPT ================= */

    const scriptPrompt = `
You are a viral YouTube Shorts scriptwriter.

Write a HIGH-RETENTION motivational script.

Topic: ${topic}

Length: 150–170 words.

IMPORTANT:
Do NOT explain thinking.
Do NOT outline.
Do NOT count words.
Return ONLY the final script.

Structure:
- First line must be short and punchy.
- Show internal struggle.
- Shift perspective unexpectedly in the middle.
- Build emotional intensity.
- End with a bold mic-drop line.

Rules:
- No clichés.
- Do NOT say "believe in yourself" or "never give up."
- Use short punchy sentences.
- Vary sentence length.
- Make it raw and human.
- No emojis.
- No headings.
`;

    const scriptResponse = await axios.post(
      GROQ_API_URL,
      {
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: scriptPrompt }],
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

    const script = scriptResponse.data.choices[0].message.content.trim();

    /* ================= TITLES ================= */

    const titlePrompt = `
Based on this script:

${script}

Generate 15 HIGH-CTR YouTube Shorts titles.

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
        max_tokens: 400
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

- 3–4 short emotional lines
- Include keywords naturally: mindset, discipline, growth, success
- Add a soft call to action
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
        max_tokens: 300
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const description = descriptionResponse.data.choices[0].message.content.trim();

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
        max_tokens: 200
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const hashtags = hashtagResponse.data.choices[0].message.content.trim();

    res.json({
      success: true,
      script,
      titles: titles.slice(0, 15),
      description,
      hashtags
    });

  } catch (error) {
    console.error("GROQ ERROR:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Generation failed"
    });
  }
});

module.exports = router;
