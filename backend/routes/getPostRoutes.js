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
    console.log("Fetched posts data:", data);
    res.send(data);
  } catch (error) {
    console.error('Facebook API error:', error?.response?.data || error.message);
    return res.status(500).json({
      error: error?.response?.data?.error?.message || 'Failed to fetch posts from Facebook'
    });
  }
});

router.get('/getallpostsfilter', async (req, res) => {
  const { pageId, accessToken, sortBy, order = 'desc' } = req.query;

  if (!pageId || !accessToken) {
    return res.status(400).json({ error: 'Missing pageId or accessToken' });
  }

  try {
    // Get posts from Facebook
    const fbRes = await axios.get(`https://graph.facebook.com/${pageId}/posts`, {
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

    let posts = fbRes.data.data;

    // Sort if needed
    if (sortBy === 'likes') {
      posts.sort((a, b) =>
        (order === 'asc' ? 1 : -1) *
        ((a.likes?.summary?.total_count || 0) - (b.likes?.summary?.total_count || 0))
      );
    } else if (sortBy === 'comments') {
      posts.sort((a, b) =>
        (order === 'asc' ? 1 : -1) *
        ((a.comments?.summary?.total_count || 0) - (b.comments?.summary?.total_count || 0))
      );
    } else if (sortBy === 'date') {
      posts.sort((a, b) =>
        (order === 'asc' ? 1 : -1) *
        (new Date(a.created_time) - new Date(b.created_time))
      );
    }

    res.json(posts);
  } catch (error) {
    console.error('Facebook API error:', error?.response?.data || error.message);
    return res.status(500).json({
      error: error?.response?.data?.error?.message || 'Failed to fetch posts from Facebook'
    });
  }
});
module.exports = router;
