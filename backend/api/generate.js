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
    const prompt = `Write a motivational script about "${topic}" for a YouTube Short (120-140 words, 50-55 seconds).

Generate:
1. ONE script
2. THREE different titles for A/B testing (each under 60 characters)
3. ONE description (2 lines with emoji)
4. FIVE hashtags

Return ONLY valid JSON. Format:
{
"script":"script here",
"titleA":"Title A here",
"titleB":"Title B here", 
"titleC":"Title C here",
"description":"description here",
"hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.8,
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

    res.json({
      success: true,
      script: result.script,
      titleA: result.titleA,
      titleB: result.titleB,
      titleC: result.titleC,
      description: result.description,
      hashtags: result.hashtags,
      wordCount: result.script.split(/\s+/).length
    });

  } catch (error) {
    res.json({
      success: true,
      script: `${topic} is waiting. Take one step today. Your future self will thank you. Start now.`,
      titleA: `${topic} - Start Today`,
      titleB: `The Truth About ${topic}`,
      titleC: `One Step For ${topic}`,
      description: `Watch until the end. 🔥 Subscribe.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Success", "#Mindset", "#Shorts"],
      wordCount: 15
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
