const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/page', async (req, res) => {
  const { pageId, metrics, period, access_token } = req.query;

  if (!access_token) return res.status(400).json({ error: 'Missing page access token' });

  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/insights`, {
      params: {
        metric: metrics,
        period: period || 'day',
        access_token,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error fetching page insights:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});


router.get('/post', async (req, res) => {
  const { postId, access_token } = req.query;

  if (!postId || !access_token) {
    return res.status(400).json({ error: 'Missing postId or access_token' });
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${postId}/insights`, {
      params: {
        metric: 'post_impressions',
        access_token,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching post insights:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch post insights' });
  }
});


module.exports = router;
