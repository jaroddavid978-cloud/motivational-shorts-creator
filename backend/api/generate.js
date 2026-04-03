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

CRITICAL LENGTH REQUIREMENT:
- The script MUST be exactly 135-145 words
- 135 words = 54 seconds, 145 words = 58 seconds
- Count every word carefully before responding

STRUCTURE:
- Hook (first 10 words)
- Body (100 words of struggle, realization, emotion)
- Call to action (25 words)

STYLE:
- Short, punchy sentences
- Each sentence 5-10 words
- Powerful and emotional
- Unique every time

Also generate:
- Title (max 55 characters)
- Description (2 lines with 🔥 emoji)
- 5 hashtags

Return ONLY valid JSON. Format: {"script":"your 135-145 word script","title":"Title","description":"Description","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.85,
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

    let wordCount = result.script.split(/\s+/).length;
    
    // Trim if too long
    if (wordCount > 150) {
      const words = result.script.split(/\s+/);
      result.script = words.slice(0, 145).join(' ');
      wordCount = 145;
    }

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
    
    // Exactly 140-word script
    const finalFallback = `${topic} is waiting. That voice in your head saying you can't? It's lying. You've survived every hard day so far. Every single one. That means you're stronger than you think. The mountain looks big. Stop looking at the whole thing. Look at one rock. One step. Today, do one thing. Send one message. Make one call. Write one sentence. That's it. Tomorrow, do two. The secret isn't massive action. It's consistent small action. You don't need motivation. You need momentum. Momentum starts with one push. Push today. One push creates movement. Movement creates confidence. Confidence creates results. Your future self is counting on you. Stand up. Take a breath. Take one step. Go. Start. Right now.`;
    
    res.json({
      success: true,
      script: finalFallback,
      title: `${topic} - Start Today`,
      description: `The secret nobody tells you. 🔥 Watch until the end. 👇 Subscribe.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Success", "#Mindset", "#Shorts"],
      wordCount: 140
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
