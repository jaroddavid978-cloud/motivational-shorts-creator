const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const googleTTS = require('google-tts-api');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper: Download file from URL
async function downloadFile(url, filePath) {
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream'
  });
  
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Helper: Get videos from Pixabay
async function getPixabayVideos(topic, count = 5) {
  try {
    const response = await axios.get('https://pixabay.com/api/videos/', {
      params: {
        key: PIXABAY_API_KEY,
        q: topic,
        per_page: count,
        orientation: 'vertical'
      }
    });
    
    return response.data.hits.map(video => ({
      id: video.id,
      url: video.videos.large?.url || video.videos.medium?.url || video.videos.small?.url,
      duration: video.duration,
      width: video.videos.large?.width || 1920,
      height: video.videos.large?.height || 1080
    }));
  } catch (error) {
    console.error('Pixabay fetch error:', error.message);
    return [];
  }
}
// Helper: Generate script with Gemini
async function generateScript(topic) {
  try {
    const prompt = `Create a motivational YouTube Short script about "${topic}". 
Return ONLY valid JSON with this structure:
{
  "script": "The full script text here, 135-145 words. One sentence per line."
}`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 600 }
    });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    return parsed.script;
  } catch (error) {
    console.error('Script generation error:', error.message);
    // Fallback script
    return `Stop waiting for the perfect moment.\nThe only person stopping you is you.\nTake one small action today.\nJust one.\nThen another tomorrow.\nYour future self will thank you.\nStart now.`;
  }
}
// Main endpoint: Create video
router.post('/api/create-video', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  try {
    console.log(`🎬 Creating video for: ${topic}`);
    
    // Step 1: Generate script
    console.log('📝 Generating script...');
    const script = await generateScript(topic);
    const wordCount = script.split(/\s+/).length;
    console.log(`   Script: ${wordCount} words`);
    
    // Step 2: Generate voice audio URL
    console.log('🎤 Generating voice...');
    const audioUrl = googleTTS.getAudioUrl(script, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });
    
    // Step 3: Get videos
    console.log('🎥 Fetching videos...');
    const videos = await getPixabayVideos(topic, 5);
    console.log(`   Found ${videos.length} videos`);
    
    // For now, return what we have
    // Video assembly with FFmpeg will be added next
    res.json({
      success: true,
      topic: topic,
      script: script,
      wordCount: wordCount,
      audioUrl: audioUrl,
      videosFound: videos.length,
      videos: videos.slice(0, 2), // Return first 2 for preview
      message: 'Video data ready. Assembly endpoint coming next.',
      nextStep: 'Install FFmpeg on Render for video assembly'
    });
    
  } catch (error) {
    console.error('Video creation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
