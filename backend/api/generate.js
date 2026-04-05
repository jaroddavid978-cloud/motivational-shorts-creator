app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const hookTypes = [
      "Start with a brutal truth.",
      "Start with a shocking statement.",
      "Start with a deep question.",
      "Start with a future regret warning.",
      "Start with a calm but intense whisper tone.",
      "Start with a bold contrarian opinion."
    ];

    const randomHookInstruction =
      hookTypes[Math.floor(Math.random() * hookTypes.length)];

    const toneModes = [
      "dark and intense",
      "hopeful and uplifting",
      "aggressive discipline energy",
      "calm but powerful",
      "cinematic storytelling",
      "raw and emotional"
    ];

    const randomTone =
      toneModes[Math.floor(Math.random() * toneModes.length)];

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
Create a HIGH-RETENTION YouTube Shorts motivational script.

Topic: ${topic}
Tone: ${randomTone}
Duration: 40-60 seconds
Word count: 150-170 words

Rules:
- ${randomHookInstruction}
- Use emotional pacing.
- Vary sentence length.
- Avoid clichés like "believe in yourself" or "never give up".
- Make it feel human, not AI.
- Build intensity in the middle.
- End with a powerful mic-drop line.
- No emojis.
- No headings.
- No formatting.
Return ONLY the script text.
`;

    const result = await model.generateContent(prompt);
    const script = result.response.text().trim();
    const wordCount = script.split(/\s+/).length;

    // === Generate Titles ===
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
- No clickbait
- Each title must be different
Return as a plain list.
`;

    const titleResult = await model.generateContent(titlePrompt);
    const titlesRaw = titleResult.response.text().split("\n").filter(t => t.trim() !== "");

    // === Generate Description ===
    const descriptionPrompt = `
Write a YouTube Shorts description for this script:

"${script}"

Make it emotional.
Add a soft call to action.
Naturally include keywords about mindset, discipline, growth, success.
No hashtags.
No emojis.
Max 4 lines.
`;

    const descriptionResult = await model.generateContent(descriptionPrompt);
    const description = descriptionResult.response.text().trim();

    // === Generate Hashtags ===
    const hashtagPrompt = `
Generate 12 relevant YouTube Shorts hashtags for this motivational video.
Mix broad and niche.
No repetition.
Return in one line separated by spaces.
`;

    const hashtagResult = await model.generateContent(hashtagPrompt);
    const hashtags = hashtagResult.response.text().trim().split(" ");

    res.json({
      success: true,
      script,
      titles: titlesRaw.slice(0, 10),
      description,
      hashtags,
      wordCount,
      secondsEstimate: Math.round(wordCount / 2.6)
    });

  } catch (error) {
    console.error("Error:", error.message);

    res.status(500).json({
      success: false,
      error: "Generation failed"
    });
  }
});
