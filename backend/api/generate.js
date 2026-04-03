const express = require('express');
const cors = require('cors');
const path = require('path');
const { Groq } = require('groq-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({ message: 'API is running', groqKeySet: !!process.env.GROQ_API_KEY });
});

// Random hook starters
const hooks = [
  "Real talk:", "Here's the truth:", "Stop scrolling:", "Nobody tells you:",
  "Wake up:", "Pay attention:", "Listen up:", "Fact:", "Truth bomb:",
  "Let me tell you:", "Warning:", "News flash:", "Spoiler alert:",
  "Hot take:", "Unpopular opinion:", "Hard truth:", "Secret:",
  "Most people don't know:", "Here's what I learned:", "Ready?"
];

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
    
    const prompt = `Write a viral YouTube Short about "${topic}".

IMPORTANT - HOOK: Start the script with exactly this opener: "${randomHook}"

SCRIPT REQUIREMENTS:
- 140-150 words (55-60 seconds)
- Short, punchy sentences (5-10 words each)
- Emotional arc: problem → struggle → breakthrough → action
- End with powerful call to action

TITLES: Generate 3 COMPLETELY DIFFERENT, unique, clickable titles about "${topic}".
Make each title a different style:
- Title A: Curiosity-driven (makes people wonder)
- Title B: Emotional/personal ("I", "my", "me")
- Title C: Direct command/challenge

DESCRIPTION: 2-3 lines that hook viewers. Include emojis (🔥, 👇, ✅, 💪, ⚡, 🎯). End with a question or challenge.

HASHTAGS: 5 relevant hashtags (mix of broad + niche + trending)

Return ONLY valid JSON. No other text. Format:
{
"script": "start with ${randomHook} then continue...",
"titleA": "unique curiosity title",
"titleB": "unique emotional title", 
"titleC": "unique command title",
"description": "description with emojis",
"hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.95,
      max_tokens: 1200,
    });

    let responseText = completion.choices[0]?.message?.content || "";
    responseText = responseText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    
    let result;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }

    let wordCount = result.script.split(/\s+/).length;
    
    if (wordCount > 155) {
      const words = result.script.split(/\s+/);
      result.script = words.slice(0, 148).join(' ');
      wordCount = 148;
    } else if (wordCount < 135) {
      const padWords = [" One more step. You've got this.", " Take action today. Your future self will thank you.", " Now go make it happen."];
      result.script = result.script + padWords[Math.floor(Math.random() * padWords.length)];
      wordCount = result.script.split(/\s+/).length;
    }

    const secondsEstimate = Math.round(wordCount / 2.5);

    res.json({
      success: true,
      script: result.script,
      titleA: result.titleA,
      titleB: result.titleB,
      titleC: result.titleC,
      description: result.description,
      hashtags: result.hashtags,
      wordCount: wordCount,
      secondsEstimate: secondsEstimate
    });

  } catch (error) {
    console.error("Error:", error.message);
    
    const randomHookFallback = hooks[Math.floor(Math.random() * hooks.length)];
    const fallbackScript = `${randomHookFallback} ${topic} is waiting for you. That voice saying you can't? It's lying. You've survived every hard day so far. You're stronger than you think. Stop looking at the whole mountain. Look at one rock. One step. Today, do one thing. Send that message. Make that call. Write that word. Tomorrow do two. Small actions compound. Momentum starts with one push. Push today. Your future self is counting on you. Stand up. Take a breath. Take one step. Go. Now. You've got this.`;
    
    const randomTitles = [
      `The ${topic} Secret Nobody Told Me`,
      `I Tried ${topic} For 30 Days - Here's What Happened`,
      `Stop Ignoring ${topic} (Do This Today)`
    ];
    
    const descriptions = [
      `This hit different. 🔥 Watch until the end. 👇 Save this for later.`,
      `I wish I knew this sooner. ⚡ Watch now. 💪 Share with someone who needs it.`,
      `The truth about ${topic} will surprise you. 🎯 Watch. ✅ Subscribe for more.`
    ];
    
    res.json({
      success: true,
      script: fallbackScript,
      titleA: randomTitles[0],
      titleB: randomTitles[1],
      titleC: randomTitles[2],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Mindset", "#DailyMotivation", "#Shorts"],
      wordCount: 145,
      secondsEstimate: 58
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
