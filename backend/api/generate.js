const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'API is running', 
    geminiKeySet: !!process.env.GEMINI_API_KEY 
  });
});

// Different hook starters for variety
const hooks = [
  "Stop scrolling.", "Real talk.", "Here's the truth.", "Nobody tells you this.",
  "Wake up.", "Pay attention.", "Truth bomb.", "Hard truth:", "Listen up.",
  "Let me tell you.", "Fact:", "News flash:", "Spoiler alert:"
];

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Write a viral YouTube Short script about "${topic}".

CRITICAL RULES:
- Start with exactly this hook: "${randomHook}"
- Total length: 140-150 words (55-60 seconds when spoken)
- Use short sentences (5-10 words each)
- Emotional arc: problem → struggle → breakthrough → action
- End with powerful call to action

Then generate 3 different A/B test titles about "${topic}".
Make each title a different style:
- Title A: Curiosity-driven (makes people wonder)
- Title B: Emotional/personal ("I", "my", "me")  
- Title C: Direct command/challenge

Then generate a 2-line description with emojis (🔥, 👇, ✅, ⚡, 🎯).

Then generate 5 relevant hashtags.

Return ONLY valid JSON. No markdown. No extra text.
Format:
{
"script": "full script here starting with ${randomHook}",
"titleA": "curiosity title",
"titleB": "emotional title",
"titleC": "command title",
"description": "description with emojis",
"hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean and parse JSON
    let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '');
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    
    let data;
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }

    let wordCount = data.script.split(/\s+/).length;
    
    // Force correct length if needed
    if (wordCount > 155) {
      const words = data.script.split(/\s+/);
      data.script = words.slice(0, 148).join(' ');
      wordCount = 148;
    } else if (wordCount < 135) {
      data.script = data.script + " One more step. You've got this. Your future self is waiting. Start today.";
      wordCount = data.script.split(/\s+/).length;
    }

    res.json({
      success: true,
      script: data.script,
      titleA: data.titleA,
      titleB: data.titleB,
      titleC: data.titleC,
      description: data.description,
      hashtags: data.hashtags,
      wordCount: wordCount,
      secondsEstimate: Math.round(wordCount / 2.5)
    });

  } catch (error) {
    console.error("Gemini Error:", error.message);
    
    // Fallback response
    const fallbackScript = `${hooks[Math.floor(Math.random() * hooks.length)]} ${topic} is waiting for you. That voice saying you can't? It's lying. You've survived every hard day so far. You're stronger than you think. Stop looking at the whole mountain. Look at one rock. One step. Today, do one thing. Send that message. Make that call. Write that word. Tomorrow do two. Small actions compound. Momentum starts with one push. Push today. Your future self is counting on you. Stand up. Take a breath. Take one step. Go. Now. You've got this.`;
    
    res.json({
      success: true,
      script: fallbackScript,
      titleA: `Why I Care About ${topic}`,
      titleB: `The ${topic} Truth Nobody Tells You`,
      titleC: `Stop Ignoring Your ${topic}`,
      description: `This hit different. 🔥 Watch until the end. 👇 Subscribe for more.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#MindsetShift", "#DailyMotivation", "#Shorts"],
      wordCount: 140,
      secondsEstimate: 56
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Gemini API key is ${process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET'}`);
});
