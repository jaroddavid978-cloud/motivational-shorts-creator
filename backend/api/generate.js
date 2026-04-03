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
    const prompt = `Write a motivational script about "${topic}" for a YouTube Short.

CRITICAL: The script MUST be exactly 140-150 words total.
At normal speaking pace: 140 words = 55 seconds, 150 words = 60 seconds.
Count every word before responding.

STRUCTURE:
- First 5 words: Hook
- Next 40 words: The struggle
- Next 50 words: The turning point
- Next 30 words: Call to action
- Final 10 words: Strong closing

Write naturally. Short sentences. Powerful emotion.

Also generate:
- Title (max 60 characters, emotional, clickable)
- Description (2 lines with emojis, ends with call to action)
- 5 hashtags (trending + niche)

Return ONLY valid JSON. No other text.
Example format: {"script":"your 140-150 word script here","title":"Title Here","description":"Description with 🔥 emoji","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.7,
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
    console.log(`Generated ${wordCount} words for topic: ${topic}`);

    res.json({
      success: true,
      script: result.script,
      title: result.title,
      description: result.description,
      hashtags: result.hashtags,
      wordCount: wordCount
    });

  } catch (error) {
    console.error("Error:", error.message);
    
    // Fallback script - exactly 145 words
    const fallbackScript = `Listen to me. ${topic} is waiting for you. Right now. That voice in your head saying you can't? It's lying. You've survived every hard day so far. Every single one. That means you're stronger than you think. ${topic} feels impossible because you're looking at the whole mountain. Stop that. Look at one rock. One small step. Today, do one thing. Send one message. Make one call. Write one sentence. That's it. Tomorrow, do two. The secret isn't massive action. It's consistent small action. You don't need motivation. You need momentum. And momentum starts with one push. So push today. Just once. One push creates movement. Movement creates confidence. Confidence creates results. Your future self is counting on you. Now stand up. Take one breath. Take one step. Go. Start. Right now. You've got this.`;
    
    res.json({
      success: true,
      script: fallbackScript,
      title: `${topic} - One Step Changes Everything`,
      description: `The secret nobody tells you about ${topic}. 🔥 Watch until the end. 👇 Subscribe for daily motivation.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#SuccessMindset", "#DailyMotivation", "#Shorts"],
      wordCount: fallbackScript.split(/\s+/).length
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
