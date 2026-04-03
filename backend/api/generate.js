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
  res.json({ message: 'API is running' });
});

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const prompt = `You are a professional motivational script writer for YouTube Shorts (55-60 seconds). Generate a powerful, high-retention script about "${topic}".

Requirements:
- First 3 seconds must be a strong hook that stops the scroll
- Total length: 120-150 words (55-60 seconds spoken)
- Use short, punchy sentences
- Build emotion: struggle → realization → action
- End with a strong call to action

Also generate:
1. ONE title (high CTR, emotional, under 60 characters)
2. ONE description (2 lines hook + 2 lines value + call to action)
3. 5 relevant hashtags

Return ONLY valid JSON in this exact format:
{
  "script": "the full script here",
  "title": "title here",
  "description": "description here",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    // Parse JSON from response
    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      result = {
        script: `Stop waiting. Start ${topic}. Today. Not tomorrow. Not next week. Right now. The only thing standing between you and your breakthrough is action. Take one step. Just one. That's how everything changes.`,
        title: `${topic} - The Only Way Forward`,
        description: `The secret to ${topic} is simpler than you think. Watch until the end. 🔥\n\nFollow for daily motivation.`,
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
    console.error("Groq API error:", error);
    res.status(500).json({ error: "Failed to generate script. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
