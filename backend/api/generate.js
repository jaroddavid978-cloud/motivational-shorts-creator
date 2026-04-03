const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Motivational Shorts Creator API is running' });
});

app.post('/api/generate-script', (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }
  
  // Temporary response - AI integration will come later
  res.json({
    success: true,
    script: `This is a motivational script about ${topic}. Stay strong, keep going, you got this!`,
    title: `${topic} - Motivational Short`,
    description: `Watch this motivational short about ${topic}. Get inspired and take action today!`,
    hashtags: [`#${topic}`, '#Motivation', '#Shorts']
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
