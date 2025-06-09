// routes/facebook.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

/**
 * GET /facebook/posts
 * Query params:
 *   - pageId
 *   - accessToken
 */
router.get('/getallposts', async (req, res) => {
  const { pageId, accessToken } = req.query;
    console.log("Received request to fetch posts for pageId:", pageId);
  console.log("Access Token:", accessToken);
  if (!pageId || !accessToken) {
    return res.status(400).json({ error: 'Missing pageId or accessToken' });
  }

  try {
    
    const { data } = await axios.get(`https://graph.facebook.com/${pageId}/posts`, {
      params: {
        access_token: accessToken,
        fields: [
          'id',
          'message',
          'created_time',
          'full_picture',
          'attachments{media_type,media,url}',
          'likes.summary(true)',
          'comments.summary(true){message,from,created_time}'
        ].join(',')
      }
    });

    res.json(data);
  } catch (error) {
    console.error('Facebook API error:', error?.response?.data || error.message);
    return res.status(500).json({
      error: error?.response?.data?.error?.message || 'Failed to fetch posts from Facebook'
    });
  }
});


module.exports = router;
