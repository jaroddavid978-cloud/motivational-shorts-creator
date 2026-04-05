const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing in environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Hook variations
const hookTypes = [
  "Start with a brutal truth.",
  "Start with a shocking statement.",
  "Start with a deep emotional question.",
  "Start with a regret-based future warning.",
  "Start calm but intense.",
  "Start with a bold contrarian opinion."
];

// Tone modes
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

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest"
    });

    // SCRIPT
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
- Make it feel human, not AI-generated.
- Build emotional intensity in the middle.
- End with a powerful mic-drop closing line.
- No emojis.
- No headings.
- No formatting.

Return ONLY the script text.
`;

    const scriptResult = await model.generateContent(scriptPrompt);

    if (!scriptResult.response || !scriptResult.response.candidates) {
      throw new Error("Invalid Gemini response structure (script).");
    }

    const script = scriptResult.response.text().trim();
    const wordCount = script.split(/\s+/).length;
    const secondsEstimate = Math.round(wordCount / 2.6);

    // TITLES
    const titlePrompt = `
Based on this script:

"${script}"

Generate:
- 5 curiosity-driven titles
- 5 emotional titles
- 5 authority/statement titles

Rules:
- Max 60 characters
- No emojis
- No hashtags
- No clickbait phrases
- All titles must be different
- Highly clickable

Return as plain text, one title per line.
`;

    const titleResult = await model.generateContent(titlePrompt);

    if (!titleResult.response) {
      throw new Error("Invalid Gemini response structure (titles).");
    }

    const titlesRaw = titleResult.response.text()
      .split("\n")
      .map(t => t.trim())
      .filter(t => t.length > 5);

    // DESCRIPTION
    const descriptionPrompt = `
Write a YouTube Shorts description for this motivational script:

"${script}"

Rules:
- Emotional tone
- 3-4 short lines
- Add soft call to action
- Naturally include keywords:
  mindset, discipline, growth, success, self improvement
- No hashtags
- No emojis
`;

    const descriptionResult = await model.generateContent(descriptionPrompt);

    if (!descriptionResult.response) {
      throw new Error("Invalid Gemini response structure (description).");
    }

    const description = descriptionResult.response.text().trim();

    // HASHTAGS
    const hashtagPrompt = `
Generate 12 relevant YouTube Shorts hashtags for this motivational video.

Rules:
- Mix broad and niche hashtags
- No repetition
- Include #Shorts
- Return in one single line separated by spaces
`;

    const hashtagResult = await model.generateContent(hashtagPrompt);

    if (!hashtagResult.response) {
      throw new Error("Invalid Gemini response structure (hashtags).");
    }

    const hashtags = hashtagResult.response.text()
      .trim()
      .split(" ")
      .filter(tag => tag.startsWith("#"));

    res.json({
      success: true,
      topic,
      tone: randomTone,
      script,
      titles: titlesRaw.slice(0, 15),
      description,
      hashtags,
      wordCount,
      secondsEstimate
    });

  } catch (error) {
    console.error("GENERATION ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message || "Content generation failed"
    });
  }
});

module.exports = router;
