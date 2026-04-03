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
- The script MUST be between 140-160 words
- When spoken at normal pace, this equals 55-60 seconds
- Count every word carefully

STRUCTURE REQUIREMENTS:
- First 5 words: Scroll-stopping hook
- Then build emotional struggle (40 words)
- Then realization/turning point (40 words)
- Then call to action (40 words)
- End with powerful closing line

EXAMPLE SCRIPT LENGTH (140 words):
"Listen to me closely. You feel stuck right now. That heaviness in your chest. The doubt creeping in every morning. I know that feeling. We all do. But here's what nobody tells you about ${topic}. The pain you're avoiding? That's actually your compass. Every successful person faced this exact moment. The moment where giving up seemed easier. But they didn't. They took one small step. Then another. Then another. You don't need a perfect plan. You just need to start. Send that email. Make that call. Write that first word. Take five minutes of action today. Tomorrow take ten. The mountain moves one stone at a time. Your future self is already thanking you for not quitting today. Now stand up. Take a breath. Take one step. That's all. Just one."

Now write a UNIQUE script about "${topic}" following the 140-160 word requirement.

Also generate:
- Title (max 60 chars, high CTR)
- Description (2-3 lines with emojis)
- 5 hashtags

Return ONLY valid JSON. Format:
{"script":"your 140-160 word script here","title":"Your Title Here","description":"Your description with emojis here","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"]}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-70b-8192",
      temperature: 0.8,
      max_tokens: 1200,
    });

    let responseText = completion.choices[0]?.message?.content || "";
    console.log("Raw response length:", responseText.length);
    
    responseText = responseText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    
    let result;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback with proper length
      result = {
        script: `Listen to me. ${topic} is not your enemy. It's your teacher. Every morning you wake up with that voice. The one saying you can't. The one listing all your failures. But here's what you need to understand. That voice is lying. You have survived every single hard day so far. Every single one. That means you are stronger than you think. ${topic} feels impossible because you're looking at the whole mountain. Stop that. Look at one rock. One step. One small win today. Send one message. Make one call. Write one sentence. That's it. Tomorrow, do two. The secret isn't massive action. It's consistent small action. You don't need motivation. You need momentum. And momentum starts with one push. So push today. Just once. Your future self is counting on you. Now go. Start. Right now.`,
        title: `${topic} - One Step Changes Everything`,
        description: `The secret nobody tells you about ${topic}. 🔥 Watch until the end. 👇 Subscribe for daily motivation.`,
        hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#SuccessMindset", "#DailyMotivation", "#Shorts"]
      };
    }

    // Verify word count
    const wordCount = result.script.split(/\s+/).length;
    console.log(`Generated script word count: ${wordCount}`);

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
    const fallbackScript = `Listen to me carefully. ${topic} is standing between you and your future. But not the way you think. That fear you feel? That's actually excitement in disguise. Your brain can't tell the difference. Every morning you have a choice. Stay comfortable or grow. Comfort feels safe but it's a trap. Growth feels scary but it's the only path forward. Think about who you were one year ago. You've grown so much already. Give yourself credit. ${topic} is just the next level. And you are ready for it. You wouldn't have the desire if you didn't have the ability. Take one deep breath. Stand up straight. Take one small action. Text a friend. Write down your goal. Take five minutes of movement. That one action creates momentum. Momentum creates confidence. Confidence creates results. Start today. Not tomorrow. Today. You've got this. Now go prove it.`;
    
    res.json({
      success: true,
      script: fallbackScript,
      title: `${topic} - You Are Ready For This`,
      description: `This will change how you see ${topic}. 🔥 Subscribe for more.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Success", "#Mindset", "#Shorts"],
      wordCount: fallbackScript.split(/\s+/).length
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
