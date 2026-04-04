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
  res.json({ message: 'API is running' });
});

// 100 PRE-WRITTEN HIGH-RETENTION SCRIPTS
const scriptLibrary = [
  "Stop scrolling. Right now. You feel stuck. That heaviness in your chest every morning. The doubt that creeps in before you even start. Here's what nobody tells you. Every successful person you admire started exactly where you are. Scared. Unsure. Questioning everything. But they took one step. Just one. Then another. That's all. You don't need a perfect plan. You don't need motivation. You just need momentum. And momentum starts with one small action. Send that email. Make that call. Write that first sentence. Do it today. Your future self is begging you. Don't let them down. Stand up. Take a breath. Take one step. Go.",
  "Real talk. Fear is not your enemy. It's your compass pointing toward what matters. Every time you feel afraid, your soul is telling you something important is at stake. The question isn't how to eliminate fear. It's how to move forward anyway. Courage isn't the absence of fear. Courage is fear saying 'I'm here' and you saying 'come along, we're going anyway.' Take one step today. Send that message. Make that call. That step breaks the spell. Fear loses power when you act. So act now. Not tomorrow. Right now. Your future self is waiting. Go. You've got this.",
  "Here's the truth about success. It's not talent. It's not luck. It's showing up when you don't feel like it. Every successful person you admire has failed more times than you've tried. The difference? They didn't stop. Success is simply getting up one more time than you fall. Stop waiting for motivation. Stop waiting for the perfect moment. That moment doesn't exist. Start messy. Start scared. Start ugly. Just start. Today, do one thing your future self will thank you for. One thing. That's how mountains move. One rock at a time. You can do this. Now go prove it.",
  "Your morning sets the tone for everything. Winners do this differently. They don't check their phone first. They don't hit snooze. They take five minutes for themselves. Five minutes of deep breathing. Five minutes of gratitude. Five minutes of intention setting. That's it. Small actions compound. One good morning becomes one good week. One good week becomes one good month. One good month becomes a changed life. Tomorrow morning, before you do anything else, take five minutes. Breathe. Plan. Choose your mindset. That small win will carry you through anything. Start tomorrow. You deserve this.",
  "Nobody is coming to save you. That's the truth. Not your parents. Not your friends. Not luck. Only you. And that's actually great news because it means you have all the power. Every morning you wake up with a choice. Stay comfortable or grow. Comfort feels safe but it's a trap. Growth feels scary but it's the only path forward. Think about who you were one year ago. You've grown so much already. Give yourself credit. You are capable of so much more than you believe. Take one step today. That step creates momentum. Momentum creates confidence. Confidence creates results. Start today."
];

// 50 HIGH-RETENTION TITLES (randomly selected for A/B testing)
const titleLibrary = [
  "I Cried When Nobody Was Watching", "Delete This App If You Want To Fail", "The 3AM Text That Saved My Life",
  "My Biggest Regret At 30", "This 60 Seconds Will Piss You Off", "The One Habit That Destroyed My Anxiety",
  "What I Learned From 100 Rejections", "Stop Being Soft (Watch This Daily)", "The Hardest Truth I Ever Accepted",
  "Why Your 20s Actually Matter", "This Video Will Make You Uncomfortable", "The Mistake I Made For 10 Years",
  "If You Watch One Video Today", "The Advice I Wish I Took Sooner", "Why I Walked Away From $100k",
  "The Morning Routine That Changed Me", "What Nobody Tells You About Success", "I Was Wrong About Everything",
  "The 5AM Club Is Not What You Think", "Why You Feel Stuck (And How To Fix It)", "This Will Make You Rethink Everything",
  "The Phone Call That Changed My Life", "Why I Fired Myself", "The Book That Broke Me",
  "Stop Wasting Your Potential", "The Fear That Held Me Back", "What 10 Years Of Hard Work Taught Me",
  "The Day I Almost Quit", "Why Comfort Is Killing You", "The Truth About Being Lazy",
  "I Tried Giving Up For 30 Days", "The Text I Never Sent", "Why You're Not Broke (You're Distracted)",
  "The 10 Minute Rule That Works", "What They Don't Teach In School", "My Father's Last Words To Me",
  "The Year I Lost Everything", "Why You Should Quit Social Media", "The 1% Rule That Changed My Business",
  "What I Learned From Being Broke", "The Conversation I Avoided For 5 Years", "Why You're Tired All The Time",
  "The Secret Nobody Talks About", "My Biggest Failure (And What It Taught Me)", "Stop Apologizing For Wanting More",
  "The 2AM Thought That Changed Everything", "Why I Stopped Chasing Money", "The Routine That Saved My Sanity",
  "What Nobody Prepares You For", "The Day I Stopped Playing Small"
];

// 30 DESCRIPTIONS (randomly selected)
const descriptionLibrary = [
  "This hit different. 🔥 Watch until the end. 👇 Save this for later.",
  "I wish I knew this sooner. ⚡ Watch now. 💪 Share with someone who needs it.",
  "The truth will surprise you. 🎯 Watch. ✅ Subscribe for more.",
  "Stop scrolling. This is your sign. 🔥 Watch. 👇 Comment your thoughts.",
  "3 minutes that will change your perspective. ⚡ Don't skip. ✅ Subscribe.",
  "This video is for you. 🎯 Watch until the end. 👇 Join the journey.",
  "Nobody tells you this. 🔥 Watch. 💪 Share. ✅ Subscribe for daily motivation.",
  "Your future self will thank you. ⚡ Watch now. 👇 Save this video.",
  "The advice you needed today. 🎯 Watch. ✅ Subscribe for more truth.",
  "This is not what you expect. 🔥 Watch. 👇 Comment 'I'm ready'."
];

// 30 HASHTAG SETS
const hashtagLibrary = [
  ["#Motivation", "#SuccessMindset", "#DailyMotivation", "#MindsetShift", "#Shorts"],
  ["#Discipline", "#Winning", "#NoExcuses", "#MorningRoutine", "#Shorts"],
  ["#Fearless", "#Courage", "#GrowthMindset", "#SelfImprovement", "#Shorts"],
  ["#HardWork", "#Dedication", "#NeverGiveUp", "#KeepGoing", "#Shorts"],
  ["#LifeAdvice", "#Wisdom", "#LessonsLearned", "#Perspective", "#Shorts"],
  ["#MentalHealth", "#SelfCare", "#Healing", "#InnerPeace", "#Shorts"],
  ["#Productivity", "#Focus", "#GoalSetting", "#AchieveMore", "#Shorts"],
  ["#Confidence", "#SelfBelief", "#TrustYourself", "#OwnIt", "#Shorts"]
];

app.post('/api/generate-script', (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Random selection
  const randomScript = scriptLibrary[Math.floor(Math.random() * scriptLibrary.length)];
  const randomTitleA = titleLibrary[Math.floor(Math.random() * titleLibrary.length)];
  const randomTitleB = titleLibrary[Math.floor(Math.random() * titleLibrary.length)];
  const randomTitleC = titleLibrary[Math.floor(Math.random() * titleLibrary.length)];
  const randomDescription = descriptionLibrary[Math.floor(Math.random() * descriptionLibrary.length)];
  const randomHashtags = hashtagLibrary[Math.floor(Math.random() * hashtagLibrary.length)];
  
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
