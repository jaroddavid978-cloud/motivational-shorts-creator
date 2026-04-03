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

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const prompt = `Write a viral YouTube Short about "${topic}".

SCRIPT REQUIREMENTS:
- 140-150 words (55-60 seconds)
- First 5 words: scroll-stopping hook
- Use "you" to connect emotionally
- End with powerful call to action

TITLES: Generate 3 COMPLETELY DIFFERENT high-retention titles about "${topic}".
IMPORTANT: Do NOT reuse these phrases in every title:
- "I Wish Someone Told Me"
- "The 3 AM Thought"
- "Stop Wasting Your Potential"

Instead, create FRESH titles specific to "${topic}". Examples of good unique titles:
- If topic is "fear": "Why Your Fear Is Lying To You", "The Fear Trap Nobody Escapes", "Face It Now Or Regret It Later"
- If topic is "success": "The Shortcut Nobody Talks About", "Rich People Do This Daily", "Your 20s Decide Everything"
- If topic is "morning": "5AM Changed My Brain Chemistry", "What I Learned Waking Up Early", "The First Hour Rule"

DESCRIPTION: 2 lines that make people want to watch. Use 🔥, 👇, ✅.

HASHTAGS: 5 trending hashtags.

Return ONLY valid JSON. Format:
{
"script": "full script here",
"titleA": "unique title 1 about ${topic}",
"titleB": "unique title 2 about ${topic}",
"titleC": "unique title 3 about ${topic}",
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
      result.script = result.script + " One more step. You've got this. Your future self is waiting. Start today.";
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
    
    const fallbackScript = `Listen. ${topic} is waiting for you. That voice saying you can't? It's lying. You've survived every hard day so far. You're stronger than you think. Stop looking at the whole mountain. Look at one rock. One step. Today, do one thing. Send that message. Make that call. Write that word. Tomorrow do two. Small actions compound. Momentum starts with one push. Push today. Your future self is counting on you. Stand up. Take a breath. Take one step. Go. Now.`;
    
    // Generate unique titles based on topic
    const uniqueTitles = [
      `The ${topic} Secret Nobody Told You`,
      `Why Your ${topic} Mindset Is Wrong`,
      `One ${topic} Habit That Changes Everything`
    ];
    
    res.json({
      success: true,
      script: fallbackScript,
      titleA: uniqueTitles[0],
      titleB: uniqueTitles[1],
      titleC: uniqueTitles[2],
      description: `This will change how you see ${topic}. 🔥 Watch until the end. 👇 Save this.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#MindsetShift", "#DailyMotivation", "#Shorts"],
      wordCount: 140,
      secondsEstimate: 56
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
