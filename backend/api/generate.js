const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const hookTypes = [
  "Start with a brutal truth.",
  "Start with a shocking statement.",
  "Start with a deep emotional question.",
  "Start with a regret-based future warning.",
  "Start calm but intense.",
  "Start with a bold contrarian opinion."
];

const toneModes = [
  "dark and intense",
  "hopeful and uplifting",
  "aggressive discipline energy",
  "calm but powerful",
  "cinematic storytelling",
  "raw and emotional",
  "silent grind mentality",
  "comeback story energy"
];

router.post('/generate-script', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const randomHookInstruction =
      hookTypes[Math.floor(Math.random() * hookTypes.length)];

    const randomTone =
      toneModes[Math.floor(Math.random() * toneModes.length)];

    // ✅ FIXED MODEL NAME
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const scriptPrompt = `
Create a HIGH-RETENTION YouTube Shorts motivational script.

Topic: ${topic}
Tone: ${randomTone}
Duration: 40-60 seconds
Word count: 150-170 words

Rules:
- ${randomHookInstruction}
- Vary sentence length naturally.
- Avoid clichés like "believe in yourself" or "never give up".
- Make it feel human.
- Build emotional intensity in the middle.
- End with a powerful mic-drop closing line.
- No emojis.
- No headings.
- No formatting.

Return ONLY the script text.
`;

    const scriptResult = await model.generateContent(scriptPrompt);
    const script = scriptResult.response.text().trim();

    const wordCount = script.split(/\s+/).length;
    const secondsEstimate = Math.round(wordCount / 2.6);

    const titlePrompt = `
Based on this script:

"${script}"

Generate:
- 5 curiosity-driven titles
- 5 emotional titles
- 5 authority titles

Max 60 characters.
No emojis.
No hashtags.
One per line.
`;

    const titleResult = await model.generateContent(titlePrompt);
    const titles = titleResult.response.text()
      .split("\n")
      .map(t => t.trim())
      .filter(t => t.length > 5);

    const descriptionPrompt = `
Write a YouTube Shorts description for this script.
3-4 short emotional lines.
Include keywords: mindset, discipline, growth, success.
No hashtags.
No emojis.
`;

    const descriptionResult = await model.generateContent(descriptionPrompt);
    const description = descriptionResult.response.text().trim();

    const hashtagPrompt = `
Generate 12 YouTube Shorts hashtags.
Include #Shorts.
One line separated by spaces.
`;

    const hashtagResult = await model.generateContent(hashtagPrompt);
    const hashtags = hashtagResult.response.text()
      .trim()
      .split(" ")
      .filter(tag => tag.startsWith("#"));

    res.json({
      success: true,
      topic,
      tone: randomTone,
      script,
      titles: titles.slice(0, 15),
      description,
      hashtags,
      wordCount,
      secondsEstimate
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
