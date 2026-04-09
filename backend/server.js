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

// Status check
app.get('/api/status', (req, res) => {
  res.json({
    message: 'API running',
    groqKeyExists: !!process.env.GROQ_API_KEY,
    groqKeyLength: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0,
    geminiKeyExists: !!process.env.GEMINI_API_KEY,
    geminiModelEnv: process.env.GEMINI_MODEL || null
  });
});

// Routes
const generateRoute = require('./api/generate');
const modelsRoute = require('./api/models');

app.use('/api', generateRoute);
app.use('/api', modelsRoute);

// Optional: API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
