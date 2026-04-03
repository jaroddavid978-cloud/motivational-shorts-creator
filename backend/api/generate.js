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

const hooks = [
  "Real talk:", "Here's the truth:", "Stop scrolling:", "Nobody tells you:",
  "Wake up:", "Pay attention:", "Truth bomb:", "Hard truth:",
  "Let me be real:", "Facts:", "News flash:", "Spoiler:"
];

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
    
    const prompt = `Create a viral YouTube Short about "${topic}".

HOOK: Start the script with "${randomHook}"

SCRIPT: 140-150 words, short sentences, emotional, ends with call to action.

TITLES: Create 3 UNIQUE titles about "${topic}". 
DO NOT use these patterns: "The ___ Secret Nobody Told Me", "I Tried ___ For 30 Days", "Stop Ignoring ___".
Instead, create fresh titles. Examples of good unique titles:
- "Why I Cried At 3AM About This"
- "The One Text That Changed My Life"
- "Delete This App If You Want To Fail"
- "My Biggest Regret At 30"
- "This 60 Seconds Will Piss You Off"

DESCRIPTION: 2 lines with emojis. Make people curious.

Return ONLY valid JSON. Format:
{
"script": "script starting with ${randomHook}",
"titleA": "unique title 1",
"titleB": "unique title 2",
"titleC": "unique title 3",
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
      result.script = result.script + " Take one step today. Your future self will thank you.";
      wordCount = result.script.split(/\s+/).length;
    }

    res.json({
      success: true,
      script: result.script,
      titleA: result.titleA,
      titleB: result.titleB,
      titleC: result.titleC,
      description: result.description,
      hashtags: result.hashtags,
      wordCount: wordCount,
      secondsEstimate: Math.round(wordCount / 2.5)
    });

  } catch (error) {
    console.error("Error:", error.message);
    
    // Get AI to generate even in fallback
    try {
      const fallbackPrompt = `Generate ONLY 3 unique YouTube titles about "${topic}". No patterns. Be creative. Return ONLY JSON: {"titleA":"title1","titleB":"title2","titleC":"title3"}`;
      const fbCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: fallbackPrompt }],
        model: "llama3-70b-8192",
        temperature: 0.9,
        max_tokens: 200,
      });
      let fbText = fbCompletion.choices[0]?.message?.content || "";
      fbText = fbText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
      const fbMatch = fbText.match(/\{[\s\S]*\}/);
      let fbTitles = { titleA: "Start Today", titleB: "Don't Give Up", titleC: "You Got This" };
      if (fbMatch) {
        fbTitles = JSON.parse(fbMatch[0]);
      }
      
      const randomHookFallback = hooks[Math.floor(Math.random() * hooks.length)];
      const fallbackScript = `${randomHookFallback} ${topic} is your moment. Stop waiting. Start today. One small step changes everything. You have the power. Use it now. Your future self is counting on you. Go.`;
      
      res.json({
        success: true,
        script: fallbackScript,
        titleA: fbTitles.titleA || `${topic} Changed My Life`,
        titleB: fbTitles.titleB || `The ${topic} Truth`,
        titleC: fbTitles.titleC || `One ${topic} Habit`,
        description: `Watch this if you need motivation today. 🔥 👇`,
        hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Shorts"],
        wordCount: 60,
        secondsEstimate: 24
      });
    } catch (fbError) {
      const randomHookFallback = hooks[Math.floor(Math.random() * hooks.length)];
      res.json({
        success: true,
        script: `${randomHookFallback} ${topic} is waiting. Start today. One step. You've got this.`,
        titleA: `Why I Care About ${topic}`,
        titleB: `The ${topic} Moment That Changed Me`,
        titleC: `Stop Ignoring Your ${topic}`,
        description: `This hit different. 🔥 Watch. 👇 Subscribe.`,
        hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Shorts"],
        wordCount: 45,
        secondsEstimate: 18
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
