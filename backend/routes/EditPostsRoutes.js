const express = require('express');
const axios = require('axios');
const router = express.Router();
router.post('/editpost', async (req, res) => {
  const { postId, accessToken, message } = req.body;

  if (!postId || !accessToken || !message) {
    return res.status(400).json({ error: 'Missing postId, accessToken, or message' });
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${postId}`,
      { message, access_token: accessToken }
    );

    res.json({ success: true, response: response.data });
  } catch (error) {
    console.error('Edit error:', error?.response?.data || error.message);
    res.status(500).json({
      error: error?.response?.data?.error?.message || 'Failed to edit post'
    });
  }
});

// Delete a post
router.delete('/deletepost', async (req, res) => {
  const { postId, accessToken } = req.body;

  if (!postId || !accessToken) {
    return res.status(400).json({ error: 'Missing postId or accessToken' });
  }

  try {
    const response = await axios.delete(`https://graph.facebook.com/${postId}`, {
      params: { access_token: accessToken }
    });

    res.json({ success: true, response: response.data });
  } catch (error) {
    console.error('Delete error:', error?.response?.data || error.message);
    res.status(500).json({
      error: error?.response?.data?.error?.message || 'Failed to delete post'
    });
  }
});
module.exports = router;