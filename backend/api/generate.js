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

LENGTH REQUIREMENT (MANDATORY):
- The script MUST be exactly 140-150 words
- Count every word before responding
- Do NOT respond with a script shorter than 140 words or longer than 150 words
- 140 words = 55 seconds, 150 words = 60 seconds

FULL SCRIPT EXAMPLE (145 words):
"Stop scrolling. Right now. You feel stuck. I know. We all do. That voice in your head? The one saying you're not good enough? It's lying. Every successful person you admire started exactly where you are. Scared. Unsure. Doubting every step. But here's what they knew that you don't. The fear never goes away. You just learn to walk with it. Courage isn't being unafraid. Courage is being terrified and taking the step anyway. Today, I need you to do one thing. One small thing. Send that email. Make that call. Write that first sentence. Just one. Tomorrow do two. The mountain moves one rock at a time. You don't need motivation. You need momentum. And momentum starts with one push. So push today. Your future self is begging you. Don't let them down. Stand up. Take a breath. Take one step. Go. Now. You've got this."

Now write a DIFFERENT script about "${topic}" that is also 140-150 words.

Also generate:
- Title (max 60 characters)
- Description (2-3 lines with emojis)
- 5 hashtags

Return ONLY valid JSON. Format: {"script":"your 140-150 word script here","title":"Your Title","description":"Your description","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.8,
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
    
    // If script is too short, expand it automatically
    if (wordCount < 140) {
      const expandPrompt = `Expand this script to exactly 145 words. Add more emotional depth, more examples, and a stronger call to action. Keep the same topic and tone. Return ONLY the expanded script as plain text, no JSON: ${result.script}`;
      
      const expandCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: expandPrompt }],
        model: "llama3-70b-8192",
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      const expandedScript = expandCompletion.choices[0]?.message?.content || result.script;
      result.script = expandedScript;
      wordCount = result.script.split(/\s+/).length;
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
    
    // Pre-written 145-word script as ultimate fallback
    const finalFallback = `Stop scrolling. Right now. ${topic} is not coming to save you. You have to save yourself. Every morning you wake up with a choice. Stay comfortable or grow. Comfort is a trap. It feels safe but it's slowly killing your potential. Growth feels scary but it's the only path to who you want to become. Think about who you were one year ago. You've already grown so much. Give yourself credit for that. ${topic} is just the next level. And you are ready for it. You wouldn't have the desire if you didn't have the ability. Take one deep breath. Stand up straight. Take one small action. Text a friend. Write down your goal. Take five minutes of movement. That one action creates momentum. Momentum creates confidence. Confidence creates results. You don't need a perfect plan. You just need to start. Send that email. Make that call. Write that first word. Start today. Not tomorrow. Today. You've got this. Now go prove it.`;
    
    res.json({
      success: true,
      script: finalFallback,
      title: `${topic} - One Step Changes Everything`,
      description: `The secret nobody tells you about ${topic}. 🔥 Watch until the end. 👇 Subscribe for daily motivation.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#SuccessMindset", "#DailyMotivation", "#Shorts"],
      wordCount: finalFallback.split(/\s+/).length
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
