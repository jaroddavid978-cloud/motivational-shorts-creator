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

app.get('/api/status', (req, res) => {
  res.json({ message: 'API is running', groqKeySet: !!process.env.GROQ_API_KEY });
});

app.post('/api/generate-script', (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Test response - no AI, just to confirm API works
  res.json({
    success: true,
    script: `🔥 HOOK: Listen to me carefully. ${topic} is not your enemy. It's your teacher. Every person who succeeded started exactly where you are right now. Scared. Unsure. Doubting. But they took one step. Then another. Then another. ${topic} will feel impossible until you start. So start small. Start ugly. Just start. That's the secret nobody tells you. You don't need motivation. You need action. Right now. Do something. Anything. Your future self is begging you.`,
    title: `The TRUTH About ${topic} Nobody Tells You`,
    description: `This one mindset shift changed everything for me. Watch until the end. 🔥 Subscribe for daily motivation.`,
    hashtags: [`#${topic.replace(/ /g, '')}`, "#Motivation", "#SuccessMindset", "#DailyMotivation", "#Shorts"]
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
