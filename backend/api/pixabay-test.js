const express = require('express');
const router = express.Router();
const axios = require('axios');

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

router.get('/test-pixabay', async (req, res) => {
  console.log('Testing Pixabay API...');
  
  if (!PIXABAY_API_KEY) {
    return res.json({ 
      success: false, 
      error: 'Pixabay API key not found in environment variables' 
    });
  }

  try {
    const response = await axios.get('https://pixabay.com/api/videos/', {
      params: {
        key: PIXABAY_API_KEY,
        q: 'motivation',
        per_page: 3,
        orientation: 'vertical'
      }
    });

    const videosFound = response.data.hits.length;
    
    let videoInfo = null;
    if (videosFound > 0) {
      const firstVideo = response.data.hits[0];
      videoInfo = {
        id: firstVideo.id,
        duration: firstVideo.duration,
        tags: firstVideo.tags,
        hasLarge: !!firstVideo.videos.large,
        hasMedium: !!firstVideo.videos.medium,
        hasSmall: !!firstVideo.videos.small
      };
    }

    res.json({
      success: true,
      totalVideos: response.data.total,
      videosFound: videosFound,
      firstVideo: videoInfo,
      message: `Pixabay API is working! Found ${videosFound} videos.`
    });

  } catch (error) {
    console.error('Pixabay error:', error.message);
    
    res.json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

module.exports = router;
