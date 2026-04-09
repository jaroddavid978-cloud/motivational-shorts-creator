// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Status check - CLEANED
app.get('/api/status', (req, res) => {
  res.json({
    message: 'API running',
    geminiKeyExists: !!process.env.GEMINI_API_KEY,
    pixabayKeyExists: !!process.env.PIXABAY_API_KEY,
    youtubeClientIdExists: !!process.env.YOUTUBE_CLIENT_ID,
    youtubeSecretExists: !!process.env.YOUTUBE_CLIENT_SECRET
  });
});
// Routes
const generateRoute = require('./api/generate');
const modelsRoute = require('./api/models');
const pixabayTestRoute = require('./api/pixabay-test');
const voiceRoute = require('./api/voice');
const createVideoRoute = require('./api/create-video');

app.use('/api', generateRoute);
app.use('/api', modelsRoute);
app.use('/api', pixabayTestRoute);
app.use('/api', voiceRoute);
app.use('/api', createVideoRoute);

// Optional: API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
