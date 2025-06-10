const express = require('express');
const axios = require('axios');
const router = express.Router();

const CLIENT_ID = '24700456586221475';
const CLIENT_SECRET = '9cce24a5e7609bde33921d2b0978986d'; // Replace with your real app secret
const REDIRECT_URI = 'http://localhost:5000/auth/facebook/callback';

// 1. Redirect user to Facebook login
router.get('/facebook', (req, res) => {
  const authURL = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,pages_manage_metadata&response_type=code`;
  res.redirect(authURL);
});

// 2. Facebook callback with code
router.get('/facebook/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }
    });

    const userAccessToken = tokenRes.data.access_token;
    req.session.userAccessToken = userAccessToken;

    res.redirect('http://localhost:5173/schedulePost'); // frontend route
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// 3. Fetch pages using access token
router.get('/facebook/pages', async (req, res) => {
  const token = req.session.userAccessToken;
  if (!token) return res.status(401).json({ error: 'User not authenticated' });

  try {
    const pageRes = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${token}`);
    res.json({ pages: pageRes.data.data });
  } catch (err) {
    console.error('Error fetching pages:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid'); // Optional: clear session cookie
    res.status(200).send('Logged out');
  });
});

module.exports = router;
