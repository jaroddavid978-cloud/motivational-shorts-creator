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

// Track generated scripts to avoid duplicates
const generatedHistory = [];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({ message: 'API is running', groqKeySet: !!process.env.GROQ_API_KEY });
});

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Add random seed and timestamp to force uniqueness
    const randomSeed = Math.floor(Math.random() * 10000);
    const timestamp = Date.now();
    
    const prompt = `Write a UNIQUE motivational script about "${topic}" for a YouTube Short. This is request #${timestamp} with seed ${randomSeed}.

CRITICAL REQUIREMENTS:
- Script must be 140-150 words exactly (55-60 seconds when spoken)
- MUST be completely different from any previous script about ${topic}
- Use different metaphors, different examples, different sentence structures
- First 3 words must be a unique hook (not "Listen to me" every time - try "Stop scrolling", "Here's truth", "Nobody warns you", "Real talk", "Wake up")

STRUCTURE:
- Hook (5 words)
- Struggle (40 words)  
- Turning point (50 words)
- Call to action (30 words)
- Closing (10 words)

Also generate:
- ONE unique title (max 60 chars, different from common titles)
- ONE unique description (2 lines with emojis)
- 5 unique hashtags

Return ONLY valid JSON. Format: {"script":"your 140-150 word script","title":"Your Title","description":"Your description","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.9,
      max_tokens: 1000,
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

    const wordCount = result.script.split(/\s+/).length;
    
    // Store in history to check duplicates (keep last 50)
    generatedHistory.unshift(result.script.substring(0, 100));
    if (generatedHistory.length > 50) generatedHistory.pop();

    res.json({
      success: true,
      script: result.script,
      title: result.title,
      description: result.description,
      hashtags: result.hashtags,
      wordCount: wordCount,
      unique: true
    });

  } catch (error) {
    console.error("Error:", error.message);
    
    // Dynamic fallback - different based on topic and timestamp
    const fallbacks = [
      `Real talk. ${topic} isn't the problem. You are. And that's good news because you can change. Every morning you wake up with the same 24 hours as everyone else. The difference? What you do with the first hour. Stop scrolling. Start moving. One small win before breakfast changes everything. ${topic} requires one thing only: action. Not perfect action. Not planned action. Just action. Do something ugly today. Do something messy. Just do something. Momentum doesn't care about perfection. It cares about movement. So move. Now.`,
      `Stop waiting. ${topic} won't come knock on your door. You have to go get it. Fear is just excitement without breath. Take a deep breath. Now take one step. That's all. Just one. Tomorrow take two. The staircase to ${topic} is built one step at a time. You don't need to see the whole path. You just need to see the next step. Take it. Then another. Your future self is already thanking you. Start today.`,
      `Here's the truth nobody tells you about ${topic}. It's supposed to be hard. The hard is what makes it great. If it was easy, everyone would do it. But everyone isn't you. You have something different. You have the willingness to suffer for what you want. Most people quit at the first sign of discomfort. Not you. You lean in. You push through. ${topic} is waiting on the other side of your discomfort. Go get it.`
    ];
    
    // Pick a random fallback based on topic hash
    const hash = topic.length + Date.now() % fallbacks.length;
    const selectedFallback = fallbacks[hash % fallbacks.length];
    
    res.json({
      success: true,
      script: selectedFallback,
      title: `${topic} - The Hard Truth You Need`,
      description: `Most people won't tell you this. 🔥 Watch until the end. 👇 Subscribe.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Winning", "#SuccessMindset", "#Shorts"],
      wordCount: selectedFallback.split(/\s+/).length
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
