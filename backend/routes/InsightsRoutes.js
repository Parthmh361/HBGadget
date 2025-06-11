const express = require('express');
const axios = require('axios');
const router = express.Router();
const Page = require('../models/Page');

// Get page insights
router.get('/page', async (req, res) => {
  const { pageId, metrics, period } = req.query;

  if (!pageId || !metrics) return res.status(400).json({ error: 'Missing pageId or metrics' });

  try {
    // Fetch access token from DB
    const page = await Page.findOne({ pageId });
    if (!page || !page.access_token) {
      return res.status(404).json({ error: 'Page or access token not found in DB' });
    }

    // Fetch insights from Facebook
    const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/insights`, {
      params: {
        metric: metrics,
        period: period || 'day',
        access_token: page.access_token,
      },
    });

    
    page.analytics.push({
      data: response.data,
      fetchedAt: new Date()
    });
    await page.save();

    res.json(response.data);
  } catch (err) {
    console.error('Error fetching page insights:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

// Get post insights
router.get('/post', async (req, res) => {
  const { postId } = req.query;

  if (!postId) {
    return res.status(400).json({ error: 'Missing postId' });
  }

  try {
    // Find the page containing this post
    const page = await Page.findOne({ "posts.postId": postId });
    if (!page || !page.access_token) {
      return res.status(404).json({ error: 'Page or access token not found in DB' });
    }

    // Fetch insights from Facebook
    const response = await axios.get(`https://graph.facebook.com/v18.0/${postId}/insights`, {
      params: {
        metric: 'post_impressions',
        access_token: page.access_token,
      },
    });

    // Save insights in the corresponding post in DB
    await Page.updateOne(
      { "posts.postId": postId },
      { $push: { "posts.$.analytics": { data: response.data, fetchedAt: new Date() } } }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching post insights:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch post insights' });
  }
});

module.exports = router;