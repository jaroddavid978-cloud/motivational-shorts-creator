const express = require('express');
const router = express.Router();
const googleTTS = require('google-tts-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test endpoint - generate voice from text
router.post('/api/generate-voice', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ 
      success: false, 
      error: 'Text is required' 
    });
  }

  try {
    // Generate audio URL from Google TTS
    const url = googleTTS.getAudioUrl(text, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });

    console.log(`Generated TTS URL for ${text.length} characters`);

    // For now, just return the URL
    // Later we'll download and save the file
    res.json({
      success: true,
      audioUrl: url,
      textLength: text.length,
      estimatedDuration: Math.ceil(text.split(' ').length * 0.4) // Rough estimate in seconds
    });

  } catch (error) {
    console.error('TTS error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download audio and save to file
router.post('/api/save-voice', async (req, res) => {
  const { text, filename } = req.body;
  
  if (!text) {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }

  try {
    const url = googleTTS.getAudioUrl(text, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, filename || `voice_${Date.now()}.mp3`);
    
    // Download the audio file
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    res.json({
      success: true,
      filePath: filePath,
      message: 'Voice saved successfully'
    });

  } catch (error) {
    console.error('Save voice error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
