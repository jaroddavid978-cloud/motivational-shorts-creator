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
    const prompt = `Write a HIGH-RETENTION motivational script for a YouTube Short about "${topic}".

CRITICAL REQUIREMENTS:
- First 3 words MUST be a scroll-stopping hook (examples: "Listen to me", "Stop scrolling", "Here's the truth", "Nobody tells you")
- Total length: 120-150 words (55-60 seconds spoken)
- Use short, punchy sentences (max 10 words each)
- Emotional arc: Struggle → Realization → Action → Transformation
- End with a powerful call to action

Also generate:
- ONE high-CTR title (under 60 characters, emotional, curiosity-driven)
- ONE optimized description (first line hooks, includes emojis, ends with CTA)
- 5 trending hashtags (mix of broad + niche)

Return ONLY valid JSON. No markdown. No explanation. Format:
{"script":"full script here","title":"title here","description":"description here","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
      max_tokens: 900,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    console.log("Raw response:", responseText);
    
    let result;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }

    res.json({
      success: true,
      script: result.script,
      title: result.title,
      description: result.description,
      hashtags: result.hashtags
    });

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to generate: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`GROQ_API_KEY is ${process.env.GROQ_API_KEY ? 'SET' : 'NOT SET'}`);
});
