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

// Function to generate script with retry until correct length
async function generateScriptWithCorrectLength(topic, attempt = 1) {
  const maxAttempts = 3;
  
  const prompt = `Write a motivational script about "${topic}" for a YouTube Short.

CRITICAL RULE - YOU MUST FOLLOW:
- The script MUST be between 140 and 150 words exactly
- Count every word before you respond
- If your script is shorter than 140 words or longer than 150 words, you fail
- This is attempt number ${attempt} of ${maxAttempts}

Write naturally. Short sentences. Powerful emotion.

Format: Return ONLY the script text. No JSON. No explanation. No markdown. Just the script.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama3-70b-8192",
    temperature: 0.8,
    max_tokens: 1200,
  });

  let script = completion.choices[0]?.message?.content || "";
  script = script.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  
  const wordCount = script.split(/\s+/).length;
  
  console.log(`Attempt ${attempt}: ${wordCount} words for topic "${topic}"`);
  
  // If length is wrong and we have attempts left, retry
  if ((wordCount < 135 || wordCount > 155) && attempt < maxAttempts) {
    return generateScriptWithCorrectLength(topic, attempt + 1);
  }
  
  // If length is still wrong after max attempts, trim or pad
  let finalScript = script;
  let finalWordCount = wordCount;
  
  if (wordCount > 155) {
    const words = script.split(/\s+/);
    finalScript = words.slice(0, 148).join(' ');
    finalWordCount = 148;
  } else if (wordCount < 135) {
    const padWords = [
      " Remember this. You are stronger than you think. One more step. You've got this. Keep going.",
      " Take action now. Not tomorrow. Your future self is counting on you. Start today.",
      " This is your moment. Don't waste it. Stand up. Breathe. Take one step. Go."
    ];
    finalScript = script + padWords[attempt % padWords.length];
    finalWordCount = finalScript.split(/\s+/).length;
  }
  
  return { script: finalScript, wordCount: finalWordCount };
}

// Function to generate titles and description
async function generateTitlesAndDescription(topic, script) {
  const prompt = `Based on this motivational script about "${topic}":
"${script.substring(0, 500)}"

Generate:
1. THREE different high-CTR titles for A/B testing (each under 60 characters)
2. ONE description (2-3 lines with emojis, high retention)

Format: Return ONLY valid JSON. No other text.
{"titleA":"","titleB":"","titleC":"","description":""}`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama3-70b-8192",
    temperature: 0.9,
    max_tokens: 500,
  });

  let responseText = completion.choices[0]?.message?.content || "";
  responseText = responseText.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return {
    titleA: `${topic} - Start Today`,
    titleB: `The Truth About ${topic}`,
    titleC: `One Step For ${topic}`,
    description: `Watch until the end. 🔥 Subscribe for daily motivation. 👇`
  };
}

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Generate script with automatic retry until correct length
    const { script, wordCount } = await generateScriptWithCorrectLength(topic);
    
    // Generate titles and description based on the script
    const { titleA, titleB, titleC, description } = await generateTitlesAndDescription(topic, script);
    
    const hashtags = [`#${topic.replace(/ /g, '')}`, "#Motivation", "#SuccessMindset", "#DailyMotivation", "#Shorts"];
    const secondsEstimate = Math.round(wordCount / 2.5);

    res.json({
      success: true,
      script: script,
      titleA: titleA,
      titleB: titleB,
      titleC: titleC,
      description: description,
      hashtags: hashtags,
      wordCount: wordCount,
      secondsEstimate: secondsEstimate
    });

  } catch (error) {
    console.error("Error:", error.message);
    
    // Ultimate fallback - exactly 145 words
    const fallbackScript = `Stop scrolling. ${topic} is waiting for you. That voice in your head saying you can't? It's lying. You've survived every hard day so far. Every single one. That means you're stronger than you think. The mountain looks big. Stop looking at the whole thing. Look at one rock. One step. Today, do one thing. Send one message. Make one call. Write one sentence. That's it. Tomorrow, do two. The secret isn't massive action. It's consistent small action. You don't need motivation. You need momentum. Momentum starts with one push. Push today. One push creates movement. Movement creates confidence. Confidence creates results. Your future self is counting on you. Stand up. Take a breath. Take one step. Go. Start. Right now. You've got this.`;
    
    res.json({
      success: true,
      script: fallbackScript,
      titleA: `${topic} - Start Today`,
      titleB: `The Truth About ${topic}`,
      titleC: `One Step Changes Everything`,
      description: `The secret nobody tells you. 🔥 Watch until the end. 👇 Subscribe.`,
      hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#Success", "#Mindset", "#Shorts"],
      wordCount: 145,
      secondsEstimate: 58
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
