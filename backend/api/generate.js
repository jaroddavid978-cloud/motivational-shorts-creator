const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../../frontend')));

// API routes
app.get('/api/status', (req, res) => {
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

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
