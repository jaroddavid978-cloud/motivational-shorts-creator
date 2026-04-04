const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ========== 20 HIGH-RETENTION SCRIPTS ==========
const scripts = [
  "Stop scrolling. Right now. You feel stuck. That heaviness in your chest every morning. The doubt that creeps in before you even start. Here's what nobody tells you. Every successful person started exactly where you are. Scared. Unsure. Questioning everything. But they took one step. Just one. Then another. That's all. You don't need a perfect plan. You just need momentum. Momentum starts with one small action. Send that email. Make that call. Write that first sentence. Do it today. Your future self is begging you. Stand up. Take a breath. Take one step. Go.",
  "Real talk. Fear is not your enemy. It's your compass pointing toward what matters. Every time you feel afraid, your soul is telling you something important is at stake. Courage isn't the absence of fear. It's moving forward anyway. Take one step today. Send that message. Make that call. That step breaks the spell. Fear loses power when you act. So act now. Not tomorrow. Right now. Your future self is waiting. Go. You've got this.",
  "Here's the truth. Success is not talent. It's not luck. It's showing up when you don't feel like it. Every successful person has failed more times than you've tried. The difference? They didn't stop. Stop waiting for motivation. Stop waiting for the perfect moment. That moment doesn't exist. Start messy. Start scared. Start ugly. Just start. Today, do one thing your future self will thank you for. One thing. That's how mountains move. One rock at a time. You can do this. Now go prove it."
];

// ========== 30 HIGH-RETENTION TITLES ==========
const titles = [
  "I Cried When Nobody Was Watching", "Delete This If You Want To Fail", "The 3AM Text That Saved My Life",
  "My Biggest Regret At 30", "This 60 Seconds Will Piss You Off", "The One Habit That Destroyed My Anxiety",
  "What I Learned From 100 Rejections", "Stop Being Soft (Watch This Daily)", "The Hardest Truth I Ever Accepted",
  "Why Your 20s Actually Matter", "This Video Will Make You Uncomfortable", "If You Watch One Video Today",
  "The Advice I Wish I Took Sooner", "Why I Walked Away From $100k", "The Morning Routine That Changed Me",
  "What Nobody Tells You About Success", "I Was Wrong About Everything", "Why You Feel Stuck (And How To Fix It)",
  "This Will Make You Rethink Everything", "The Phone Call That Changed My Life", "Stop Wasting Your Potential",
  "The Fear That Held Me Back", "What 10 Years Of Hard Work Taught Me", "The Day I Almost Quit",
  "Why Comfort Is Killing You", "The Truth About Being Lazy", "The 10 Minute Rule That Works",
  "What They Don't Teach In School", "The Year I Lost Everything", "Why You Should Quit Social Media"
];

// ========== 20 DESCRIPTIONS ==========
const descriptions = [
  "This hit different. 🔥 Watch until the end. 👇 Save this for later.",
  "I wish I knew this sooner. ⚡ Watch now. 💪 Share with someone who needs it.",
  "The truth will surprise you. 🎯 Watch. ✅ Subscribe for more.",
  "Stop scrolling. This is your sign. 🔥 Watch. 👇 Comment your thoughts.",
  "3 minutes that will change your perspective. ⚡ Don't skip. ✅ Subscribe.",
  "This video is for you. 🎯 Watch until the end. 👇 Join the journey.",
  "Nobody tells you this. 🔥 Watch. 💪 Share. ✅ Subscribe for daily motivation.",
  "Your future self will thank you. ⚡ Watch now. 👇 Save this video.",
  "The advice you needed today. 🎯 Watch. ✅ Subscribe for more truth.",
  "This is not what you expect. 🔥 Watch. 👇 Comment 'I'm ready'.",
  "You need to hear this today. 💪 Watch. 🔥 Subscribe for more.",
  "This changed my life. ⚡ Watch. 👇 Share with a friend.",
  "Stop scrolling. Start growing. 🎯 Watch. ✅ Subscribe.",
  "The hard truth you needed. 🔥 Watch. 👇 Save this.",
  "One minute that will shift your mindset. ⚡ Watch. 💪 Subscribe.",
  "I wish someone told me this sooner. 🔥 Watch. 👇 Comment your thoughts.",
  "This video is a wake up call. 🎯 Watch. ✅ Subscribe.",
  "Don't skip this one. 🔥 Watch. 👇 Share with someone who needs it.",
  "The reality check you needed today. ⚡ Watch. 💪 Subscribe.",
  "This will make you think. 🔥 Watch. 👇 Save for later."
];

// ========== 10 HASHTAG SETS ==========
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

app.post('/api/generate-script', (req, res) => {
  const { topic } = req.body;
  
  // Pick random content
  const randomScript = scripts[Math.floor(Math.random() * scripts.length)];
  const randomTitleA = titles[Math.floor(Math.random() * titles.length)];
  let randomTitleB = titles[Math.floor(Math.random() * titles.length)];
  let randomTitleC = titles[Math.floor(Math.random() * titles.length)];
  
  // Make sure titles are different
  while (randomTitleB === randomTitleA) {
    randomTitleB = titles[Math.floor(Math.random() * titles.length)];
  }
  while (randomTitleC === randomTitleA || randomTitleC === randomTitleB) {
    randomTitleC = titles[Math.floor(Math.random() * titles.length)];
  }
  
  const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
  const randomHashtags = hashtagSets[Math.floor(Math.random() * hashtagSets.length)];
  
  const wordCount = randomScript.split(/\s+/).length;

  res.json({
    success: true,
    script: randomScript,
    titleA: randomTitleA,
    titleB: randomTitleB,
    titleC: randomTitleC,
    description: randomDescription,
    hashtags: randomHashtags,
    wordCount: wordCount,
    secondsEstimate: Math.round(wordCount / 2.5)
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
