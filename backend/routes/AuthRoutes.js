const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const Page = require('../models/Page');
const router = express.Router();

// Helper to get Facebook App credentials
async function getFacebookCredentials(user_id) {
  const user = await User.findById(user_id);
  if (!user || !user.facebookAppId || !user.facebookAppSecret) {
    throw new Error('Facebook App credentials not found for user');
  }
  return {
    clientId: user.facebookAppId,
    clientSecret: user.facebookAppSecret,
  };
}

// 1. Redirect user to Facebook login
router.get('/facebook', async (req, res) => {
  const { user_id } = req.query;
  try {
    const { clientId } = await getFacebookCredentials(user_id);
    const REDIRECT_URI = https://socialsuit-backend-h9md.onrender.com/auth/facebook/callback;

    const authURL = https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read_insights,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,pages_manage_metadata,pages_show_list&response_type=code&state=${encodeURIComponent(user_id)};

    res.redirect(authURL);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Facebook callback with code
router.get('/facebook/callback', async (req, res) => {
  const { code, state } = req.query;
  const user_id = state; // extract user_id from state

  try {
    const { clientId, clientSecret } = await getFacebookCredentials(user_id);
    const REDIRECT_URI = https://socialsuit-backend-h9md.onrender.com/auth/facebook/callback;

    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        code,
      }
    });

    const userAccessToken = tokenRes.data.access_token;
    req.session.userAccessToken = userAccessToken;

    res.redirect('http://localhost:5173/home'); // your frontend
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// 3. Fetch Facebook pages
router.get('/facebook/pages', async (req, res) => {
  const token = req.session.userAccessToken;
  if (!token) return res.status(401).json({ error: 'User not authenticated' });

  try {
    const pageRes = await axios.get(https://graph.facebook.com/me/accounts?access_token=${token});
    const pages = pageRes.data.data;

    for (const page of pages) {
      await Page.findOneAndUpdate(
        { pageId: page.id },
        {
          pageId: page.id,
          name: page.name,
          category: page.category,
          category_list: page.category_list,
          access_token: page.access_token,
          tasks: page.tasks,
        },
        { upsert: true, new: true }
      );
    }

    const sanitizedPages = pages.map(({ access_token, ...rest }) => rest);
    res.json({ pages: sanitizedPages });
  } catch (err) {
    console.error('Error fetching pages:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// 4. Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid');
    res.status(200).send('Logged out');
  });
});

module.exports = router;
