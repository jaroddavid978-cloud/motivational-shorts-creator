const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    message: 'API running',
    geminiKeySet: !!process.env.GEMINI_API_KEY
  });
});

// Import generate route
const generateRoute = require('./api/generate');
app.use('/api', generateRoute);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
