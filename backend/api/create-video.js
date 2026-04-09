const express = require('express');
const router = express.Router();
const axios = require('axios');
const googleTTS = require('google-tts-api');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
      width: video.videos.large?.width || 1080,
      height: video.videos.large?.height || 1920,
      tags: video.tags
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
  "script": "The full script text here, 135-145 words. One sentence per line.",
  "titles": {
    "a": "Title option A under 55 chars",
    "b": "Title option B under 55 chars",
    "c": "Title option C under 55 chars"
  },
  "description": "Short description under 170 chars",
  "hashtags": ["#shorts", "#motivation", "#topicTag"]
}`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 600 }
    });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    return {
      script: parsed.script,
      titles: parsed.titles,
      description: parsed.description,
      hashtags: parsed.hashtags
    };
  } catch (error) {
    console.error('Script generation error:', error.message);
    // Fallback script
    const fallbackScript = `Stop waiting for the perfect moment.\nThe only person stopping you is you.\nTake one small action today.\nJust one.\nThen another tomorrow.\nYour future self will thank you.\nStart now.`;
    return {
      script: fallbackScript,
      titles: {
        a: `The Truth About ${topic}`,
        b: `${topic} Isn't What You Think`,
        c: `Stop Chasing ${topic}`
      },
      description: `The truth about ${topic} no one shares. Save this.`,
      hashtags: ['#shorts', '#motivation', `#${topic.toLowerCase()}`]
    };
  }
}
// Main endpoint: Create video
router.post('/create-video', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  try {
    console.log(`🎬 Creating video for: ${topic}`);
    
    // Step 1: Generate script
    console.log('📝 Generating script...');
    const scriptData = await generateScript(topic);
    const wordCount = scriptData.script.split(/\s+/).length;
    console.log(`   Script: ${wordCount} words`);
    
    // Step 2: Generate voice audio URL
    console.log('🎤 Generating voice...');
    const audioUrl = googleTTS.getAudioUrl(scriptData.script, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });
    console.log(`   Audio URL generated`);
    
    // Step 3: Get videos
    console.log('🎥 Fetching videos...');
    const videos = await getPixabayVideos(topic, 5);
    console.log(`   Found ${videos.length} videos`);
    
    // Return complete data
    res.json({
      success: true,
      topic: topic,
      script: scriptData.script,
      wordCount: wordCount,
      titles: scriptData.titles,
      description: scriptData.description,
      hashtags: scriptData.hashtags,
      audioUrl: audioUrl,
      videosFound: videos.length,
      videos: videos,
      message: 'Video data ready for assembly',
      estimatedDuration: Math.ceil(wordCount * 0.4) // ~2.5 words per second
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
