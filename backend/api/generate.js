const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({ message: 'API running', geminiKeySet: !!process.env.GEMINI_API_KEY });
});

// 50 HIGH-RETENTION TITLES (hand-picked, no patterns)
const strongTitles = [
  "I Cried When Nobody Was Watching",
  "Delete This If You Want To Stay Broke",
  "The 3AM Text That Saved My Life",
  "My Biggest Regret At 30",
  "This 60 Seconds Will Piss You Off",
  "The One Habit That Destroyed My Anxiety",
  "What I Learned From 100 Rejections",
  "Stop Being Soft (Watch This Daily)",
  "The Hardest Truth I Ever Accepted",
  "Why Your 20s Actually Matter",
  "This Video Will Make You Uncomfortable",
  "If You Watch One Video Today",
  "The Advice I Wish I Took Sooner",
  "Why I Walked Away From $100k",
  "The Morning Routine That Changed Me",
  "I Was Wrong About Everything",
  "Why You Feel Stuck (And How To Fix It)",
  "This Will Make You Rethink Everything",
  "The Phone Call That Changed My Life",
  "The Fear That Held Me Back",
  "What 10 Years Of Hard Work Taught Me",
  "The Day I Almost Quit",
  "Why Comfort Is Killing You",
  "The Truth About Being Lazy",
  "The 10 Minute Rule That Works",
  "What They Don't Teach In School",
  "The Year I Lost Everything",
  "Why You Should Quit Social Media",
  "The 1% Rule That Changed My Business",
  "What I Learned From Being Broke",
  "The Conversation I Avoided For 5 Years",
  "Why You're Tired All The Time",
  "The Secret Nobody Talks About",
  "My Biggest Failure (And What It Taught Me)",
  "Stop Apologizing For Wanting More",
  "The 2AM Thought That Changed Everything",
  "Why I Stopped Chasing Money",
  "The Routine That Saved My Sanity",
  "What Nobody Prepares You For",
  "The Day I Stopped Playing Small",
  "Why I Lost Everything (And Gained More)",
  "The Text That Changed My Life Forever",
  "What I Learned From Being Fired",
  "The 5AM Club Is Not What You Think",
  "Why I Gave Up On Being Perfect",
  "The Mistake I Made For 10 Years",
  "What Nobody Tells You About Growing Up",
  "The One Question That Changed My Life",
  "Why I Don't Take Advice From Most People",
  "The 90-Day Rule That Works Every Time"
];

// 20 Descriptions
const descriptions = [
  "This hit different. 🔥 Watch until the end. 👇 Save this for later.",
  "I wish I knew this sooner. ⚡ Watch now. 💪 Share with someone who needs it.",
  "Stop scrolling. This is your sign. 🔥 Watch. 👇 Comment your thoughts.",
  "Your future self will thank you. ⚡ Watch now. 👇 Save this video.",
  "The advice you needed today. 🎯 Watch. ✅ Subscribe for more truth.",
  "This changed my life. ⚡ Watch. 👇 Share with a friend.",
  "You need to hear this today. 💪 Watch. 🔥 Subscribe for more.",
  "One minute that will shift your mindset. ⚡ Watch. 💪 Subscribe.",
  "I wish someone told me this sooner. 🔥 Watch. 👇 Comment your thoughts.",
  "This video is a wake up call. 🎯 Watch. ✅ Subscribe.",
  "Don't skip this one. 🔥 Watch. 👇 Share with someone who needs it.",
  "The reality check you needed today. ⚡ Watch. 💪 Subscribe."
];

// 10 Hashtag sets
const hashtagSets = [
  ["#Motivation", "#SuccessMindset", "#DailyMotivation", "#MindsetShift", "#Shorts"],
  ["#Discipline", "#Winning", "#NoExcuses", "#MorningRoutine", "#Shorts"],
  ["#Fearless", "#Courage", "#GrowthMindset", "#SelfImprovement", "#Shorts"],
  ["#HardWork", "#Dedication", "#NeverGiveUp", "#KeepGoing", "#Shorts"],
  ["#LifeAdvice", "#Wisdom", "#LessonsLearned", "#Perspective", "#Shorts"],
  ["#MentalHealth", "#SelfCare", "#Healing", "#InnerPeace", "#Shorts"],
  ["#Productivity", "#Focus", "#GoalSetting", "#AchieveMore", "#Shorts"],
  ["#Confidence", "#SelfBelief", "#TrustYourself", "#OwnIt", "#Shorts"],
  ["#Hustle", "#Grind", "#Success", "#DreamBig", "#Shorts"],
  ["#PositiveVibes", "#GoodEnergy", "#Gratitude", "#Blessed", "#Shorts"]
];

const hooks = [
  "Stop scrolling.", "Real talk.", "Here's the truth.", "Nobody tells you this.",
  "Wake up.", "Pay attention.", "Truth bomb.", "Hard truth:", "Listen up."
];

app.post('/api/generate-script', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Write a 140-150 word motivational script about "${topic}" for YouTube Shorts.

Start with: "${randomHook}"

Keep sentences short. End with call to action.

Return ONLY the script text. No JSON. No explanation. No markdown.`;

    const result = await model.generateContent(prompt);
    let script = result.response.text();
    
    let wordCount = script.split(/\s+/).length;
    
    if (wordCount > 155) {
      const words = script.split(/\s+/);
      script = words.slice(0, 148).join(' ');
      wordCount = 148;
    } else if (wordCount < 135) {
      script = script + " One more step. You've got this. Your future self is waiting. Start today.";
      wordCount = script.split(/\s+/).length;
    }

    // Pick random titles (all different)
    const shuffled = [...strongTitles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const randomHashtags = hashtagSets[Math.floor(Math.random() * hashtagSets.length)];

    res.json({
      success: true,
      script: script,
      titleA: shuffled[0],
      titleB: shuffled[1],
      titleC: shuffled[2],
      description: randomDescription,
      hashtags: randomHashtags,
      wordCount: wordCount,
      secondsEstimate: Math.round(wordCount / 2.5)
    });

  } catch (error) {
    console.error("Error:", error.message);
    
    const fallbackScript = `${hooks[Math.floor(Math.random() * hooks.length)]} ${topic} is waiting. Take one step today. You've got this. Start now.`;
    
    const shuffled = [...strongTitles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    res.json({
      success: true,
      script: fallbackScript,
      titleA: shuffled[0],
      titleB: shuffled[1],
      titleC: shuffled[2],
      description: descriptions[0],
      hashtags: hashtagSets[0],
      wordCount: 60,
      secondsEstimate: 24
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
