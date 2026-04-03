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
    const prompt = `Write a motivational script about "${topic}" for a 55-second YouTube Short.

First 3 words must be a hook like "Listen:", "Stop:", "Truth:", "Nobody:", "Here's:".

Keep sentences very short. Total 120-150 words.

Then give me a title (max 60 chars), description (2 lines), and 5 hashtags.

Return EXACTLY this format with NO extra text, NO markdown, NO explanation. Use straight quotes, no curly quotes. Use \n for new lines inside strings.

{"script":"hook. Sentence one. Sentence two.","title":"Title Here","description":"First line. Second line.","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_tokens: 800,
    });

    let responseText = completion.choices[0]?.message?.content || "";
    console.log("Raw response:", responseText);
    
    // Clean the response
    responseText = responseText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    
    let result;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback
      result = {
        script: `Listen: ${topic} is waiting for you. Not tomorrow. Today. The only person stopping you is you. Take one step. Just one. That changes everything. You can do this. Start now.`,
        title: `${topic} - Start Today`,
        description: `This is your sign. 🔥 Watch until the end. Follow for more.`,
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
    console.error("Error:", error.message);
    // Return fallback instead of error
    res.json({
      success: true,
      script: `🔥 Listen: ${topic} is your moment. Stop waiting. Start today. One step. That's all it takes. You have the power. Use it now. Your future self will thank you.`,
      title: `${topic} - The Only Way Forward`,
      description: `This will change your perspective. 🔥 Subscribe for daily motivation.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#SuccessMindset", "#DailyMotivation", "#Shorts"]
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
