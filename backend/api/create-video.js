const express = require('express');
const router = express.Router();
const axios = require('axios');
const googleTTS = require('google-tts-api');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper: Get VERTICAL videos from Pixabay
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
      'sky'
    ];
    
    let allVideos = [];
    
    for (const term of searchTerms) {
      const response = await axios.get('https://pixabay.com/api/videos/', {
        params: {
          key: PIXABAY_API_KEY,
          q: term,
          per_page: 20,
          video_type: 'film'
        }
      });
      
      const verticalVideos = response.data.hits.filter(video => {
        const large = video.videos.large;
        return large && large.height > large.width;
      });
      
      allVideos = [...allVideos, ...verticalVideos];
      
      if (allVideos.length >= count) {
        console.log(`   Found ${allVideos.length} vertical videos`);
        break;
      }
    }
    
    return allVideos.slice(0, count).map(video => ({
      id: video.id,
      url: video.videos.large?.url || video.videos.medium?.url || video.videos.small?.url,
      duration: video.duration,
      width: video.videos.large?.width || 1080,
      height: video.videos.large?.height || 1920,
      tags: video.tags,
      isVertical: true
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

// Main endpoint: Create video
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
    
    console.log('🎤 Generating voice...');
    const audioUrls = googleTTS.getAllAudioUrls(scriptData.script, {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    });
    console.log(`   Generated ${audioUrls.length} audio chunks`);
    
    console.log('🎥 Fetching vertical videos...');
    const videos = await getPixabayVideos(topic, 5);
    console.log(`   Found ${videos.length} vertical videos`);
    
    res.json({
      success: true,
      topic: topic,
      script: scriptData.script,
      wordCount: wordCount,
      titles: scriptData.titles,
      description: scriptData.description,
      hashtags: scriptData.hashtags,
      audioUrls: audioUrls,
      audioChunks: audioUrls.length,
      videosFound: videos.length,
      videos: videos,
      isVertical: videos.length > 0 ? videos[0].isVertical : false,
      message: 'Video data ready for assembly',
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
