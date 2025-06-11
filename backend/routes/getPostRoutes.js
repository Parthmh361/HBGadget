const express = require('express');
const axios = require('axios');
const router = express.Router();
const Page = require('../models/Page');

/**
 * GET /getallposts
 * Query params:
 *   - pageId
 */
router.get('/getallposts', async (req, res) => {
  const { pageId } = req.query;
  if (!pageId) {
    return res.status(400).json({ error: 'Missing pageId' });
  }

  try {
    // Check DB first
    const page = await Page.findOne({ pageId });
    if (page && page.posts && page.posts.length > 0) {
      return res.json({ posts: page.posts });
    }

    // If not in DB, fetch from Facebook
    if (!page || !page.access_token) {
      return res.status(404).json({ error: 'Page or access token not found in DB' });
    }

    const { data } = await axios.get(`https://graph.facebook.com/${pageId}/posts`, {
      params: {
        access_token: page.access_token,
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

    // Save posts to DB
    page.posts = data.data.map(post => ({
      postId: post.id,
      message: post.message,
      created_time: post.created_time,
      full_picture: post.full_picture,
      attachments: post.attachments,
      likes: post.likes,
      comments: post.comments,
    }));
    await page.save();

    res.json({ posts: page.posts });
  } catch (error) {
    console.error('Facebook API error:', error?.response?.data || error.message);
    return res.status(500).json({
      error: error?.response?.data?.error?.message || 'Failed to fetch posts from Facebook'
    });
  }
});

/**
 * GET /getallpostsfilter
 * Query params:
 *   - pageId
 *   - sortBy (likes, comments, date)
 *   - order (asc, desc)
 */
router.get('/getallpostsfilter', async (req, res) => {
  const { pageId, sortBy, order = 'desc' } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: 'Missing pageId' });
  }

  try {
    // Check DB first
    const page = await Page.findOne({ pageId });
    let posts = [];
    if (page && page.posts && page.posts.length > 0) {
      posts = [...page.posts];
    } else {
      // If not in DB, fetch from Facebook
      if (!page || !page.access_token) {
        return res.status(404).json({ error: 'Page or access token not found in DB' });
      }

      const fbRes = await axios.get(`https://graph.facebook.com/${pageId}/posts`, {
        params: {
          access_token: page.access_token,
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

      posts = fbRes.data.data.map(post => ({
        postId: post.id,
        message: post.message,
        created_time: post.created_time,
        full_picture: post.full_picture,
        attachments: post.attachments,
        likes: post.likes,
        comments: post.comments,
      }));

      // Save posts to DB
      page.posts = posts;
      await page.save();
    }

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