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

// Initialize Groq
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

  // Check if Groq API key exists
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured. Please add GROQ_API_KEY to environment variables.' });
  }

  try {
    const prompt = `Generate a motivational script for a YouTube Short about "${topic}".

The script must be 120-150 words (55-60 seconds when spoken).

Requirements:
- First sentence must be a powerful hook
- Use short sentences
- Build emotion
- End with call to action

Also generate a title (under 60 characters), description (2-3 sentences), and 5 hashtags.

Return ONLY valid JSON. No other text. Format:
{"script":"script here","title":"title here","description":"description here","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    console.log("Raw response:", responseText);
    
    // Parse JSON from response
    let result;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback script if parsing fails
      result = {
        script: `Stop waiting. Start ${topic} today. Not tomorrow. Not next week. Right now. The only thing standing between you and your breakthrough is action. Take one step. Just one. That's how everything changes. You have the power. Use it.`,
        title: `${topic} - Start Today`,
        description: `This is your sign to start ${topic}. Watch until the end. 🔥 Follow for daily motivation.`,
        hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Success", "#Mindset", "#Shorts"]
      };
    }

    res.json({
      success: true,
      script: result.script,
      title: result.title,
      description: result.description,
      hashtags: result.hashtags
    });

  } catch (error) {
    console.error("Error details:", error.message);
    res.status(500).json({ error: "Failed to generate script: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`GROQ_API_KEY is ${process.env.GROQ_API_KEY ? 'SET' : 'NOT SET'}`);
});
