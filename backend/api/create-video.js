const express = require('express');
const router = express.Router();
const axios = require('axios');
const { EdgeTTS } = require('edge-tts-universal');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper: Get SHORT vertical videos (5-10 seconds ONLY)
async function getPixabayVideos(topic, count = 5) {
  try {
    const searchTerms = [
      topic,
      'motivation',
      'success',
      'nature',
      'inspiration',
      'landscape',
      'sunset',
      'mountain',
      'ocean',
      'sky',
      'forest',
      'water',
      'clouds'
    ];
    
    let allVideos = [];
    
    for (const term of searchTerms) {
      const response = await axios.get('https://pixabay.com/api/videos/', {
        params: {
          key: PIXABAY_API_KEY,
          q: term,
          per_page: 30,
          video_type: 'film'
        }
      });
      
      // STRICT FILTER: Vertical AND exactly 5-10 seconds
      const shortVerticalVideos = response.data.hits.filter(video => {
        const medium = video.videos.medium;
        const isVertical = medium && medium.height > medium.width;
        const isShort = video.duration >= 5 && video.duration <= 10;
        return isVertical && isShort;
      });
      
      allVideos = [...allVideos, ...shortVerticalVideos];
      
      if (allVideos.length >= count) {
        console.log(`   Found ${allVideos.length} short vertical videos (5-10s)`);
        break;
      }
    }
    
    return allVideos.slice(0, count).map(video => ({
      id: video.id,
      url: video.videos.medium?.url || video.videos.small?.url || video.videos.large?.url,
      duration: video.duration,
      width: video.videos.medium?.width || 1080,
      height: video.videos.medium?.height || 1920,
      tags: video.tags,
      isVertical: true
    }));
    
  } catch (error) {
    console.error('Pixabay fetch error:', error.message);
    return [];
  }
}

// Helper: Get stock images from Pixabay
async function getPixabayImages(topic, count = 5) {
  try {
    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: PIXABAY_API_KEY,
        q: topic,
        per_page: count,
        orientation: 'vertical',
        image_type: 'photo'
      }
    });
    
    return response.data.hits.map(img => ({
      id: img.id,
      url: img.largeImageURL || img.webformatURL,
      width: img.imageWidth,
      height: img.imageHeight
    }));
  } catch (error) {
    console.error('Pixabay images error:', error.message);
    return [];
  }
}
// Helper: Generate script with Gemini
async function generateScript(topic) {
  try {
    const prompt = `Create a motivational YouTube Short script about "${topic}".

IMPORTANT: The script MUST be 135-145 words. This is a strict requirement.

Return ONLY valid JSON. No markdown, no explanations.

{
  "script": "Write the full script here. 135-145 words. One short sentence per line. Start with a strong hook like 'I used to think...' or 'Stop waiting for...'",
  "titles": {
    "a": "Short title under 50 chars",
    "b": "Another title under 50 chars",
    "c": "Third title under 50 chars"
  },
  "description": "One sentence description under 150 chars",
  "hashtags": ["#shorts", "#motivation", "#mindset"]
}`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.9, 
        maxOutputTokens: 800,
        topP: 0.95
      }
    });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('   Gemini raw response length:', text.length);
    
    const cleanJson = text.replace(/```json\s*|```\s*/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    const wordCount = parsed.script.split(/\s+/).length;
    console.log(`   Generated script: ${wordCount} words`);
    
    if (wordCount < 100) {
      throw new Error('Script too short');
    }
    
    return {
      script: parsed.script,
      titles: parsed.titles,
      description: parsed.description,
      hashtags: parsed.hashtags
    };
  } catch (error) {
    console.error('Gemini error, using dynamic fallback:', error.message);
    
    const fallbacks = [
      {
        script: `I used to think ${topic} was about talent.\nI was wrong.\nFor years I watched others succeed while I stayed stuck.\nWaiting for the right moment.\nThe right mood.\nThe right circumstances.\nBut ${topic} isn't something you wait for.\nIt's something you build.\nOne awkward step at a time.\nOne imperfect attempt after another.\nThe people good at ${topic} aren't special.\nThey just started before they felt ready.\nThey kept going when it got hard.\nThey embraced the messy middle.\nAnd slowly, almost invisibly, they got better.\nSo what's one tiny action you can take today?\nNot tomorrow.\nNot next week.\nToday.\nDo that one thing.\nThen do it again tomorrow.\nThat's how ${topic} is actually mastered.\nStart your streak now.`,
        titles: { a: `The Truth About ${topic}`, b: `${topic} Isn't Luck`, c: `How to Master ${topic}` },
        description: `The real secret to ${topic} that nobody talks about. Save this.`,
        hashtags: ['#shorts', '#motivation', '#mindset']
      },
      {
        script: `Stop waiting to feel ready for ${topic}.\nThat feeling may never come.\nAnd if you keep waiting, you'll stay exactly where you are.\nThe people who succeed at ${topic} aren't fearless.\nThey're just willing to act despite the fear.\nThey take one small step.\nThen another.\nThen another.\nMomentum builds.\nConfidence follows action, not the other way around.\nYou don't need to see the whole staircase.\nJust take the first step.\nWhat's one thing you can do right now?\nSomething small.\nSomething that moves you forward even an inch.\nDo that.\nThen celebrate that you did it.\nTomorrow, do it again.\nThat's the secret.\nConsistency over intensity.\nNow go.`,
        titles: { a: `Stop Waiting for ${topic}`, b: `The ${topic} Secret`, c: `${topic} Starts Today` },
        description: `Why you're stuck with ${topic} and how to finally move forward.`,
        hashtags: ['#shorts', '#motivation', '#growth']
      }
    ];
    
    const selected = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    return selected;
  }
}
// Main endpoint: Create video with Edge-TTS + Images
router.post('/create-video', async (req, res) => {
  const { topic } = req.body;
  
  if (!topic) {
    return res.status(400).json({ success: false, error: 'Topic is required' });
  }

  try {
    console.log(`🎬 Creating video for: ${topic}`);
    
    console.log('📝 Generating script...');
    const scriptData = await generateScript(topic);
    const wordCount = scriptData.script.split(/\s+/).length;
    console.log(`   Final script: ${wordCount} words`);
    
    console.log('🎤 Generating Edge-TTS voice...');
    const tts = new EdgeTTS(scriptData.script, 'en-US-ChristopherNeural', {
      rate: '+5%',
      volume: '+0%'
    });
    
    const result = await tts.synthesize();
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
    const audioBase64 = audioBuffer.toString('base64');
    console.log(`   Edge-TTS audio generated (${(audioBuffer.length / 1024).toFixed(0)} KB)`);
    
    console.log('🎥 Fetching short videos (5-10s only)...');
    const videos = await getPixabayVideos(topic, 5);
    console.log(`   Found ${videos.length} short vertical videos`);
    
    console.log('🖼️ Fetching stock images...');
    const images = await getPixabayImages(topic, 5);
    console.log(`   Found ${images.length} vertical images`);
    
    // Calculate video durations
    const videoDurations = videos.map(v => v.duration);
    const totalVideoDuration = videoDurations.reduce((a, b) => a + b, 0);
    
    res.json({
      success: true,
      topic: topic,
      script: scriptData.script,
      wordCount: wordCount,
      titles: scriptData.titles,
      description: scriptData.description,
      hashtags: scriptData.hashtags,
      audioBase64: audioBase64,
      videosFound: videos.length,
      videos: videos,
      videoDurations: videoDurations,
      totalVideoDuration: totalVideoDuration,
      imagesFound: images.length,
      images: images,
      isVertical: videos.length > 0 ? videos[0].isVertical : false,
      message: 'Video data ready with Edge-TTS + Images (5-10s clips only)',
      estimatedDuration: Math.ceil(wordCount * 0.4)
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
