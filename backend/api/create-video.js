const express = require('express');
const router = express.Router();

router.post('/create-video', (req, res) => {
  const { topic } = req.body;
  
  res.json({
    success: true,
    message: 'Route is working!',
    topic: topic || 'No topic provided'
  });
});

module.exports = router;
