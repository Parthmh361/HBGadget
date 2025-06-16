const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const Page = require('../models/Page');
const router = express.Router();

// Session debugging middleware
router.use((req, res, next) => {
  console.log('🆔 Request Details:');
  console.log('  Path:', req.path);
  console.log('  Method:', req.method);
  console.log('  Session ID:', req.sessionID);
  console.log('  Has userAccessToken:', !!req.session.userAccessToken);
  console.log('  Cookie header:', req.headers.cookie);
  console.log('  User-Agent:', req.headers['user-agent']?.substring(0, 50));
  console.log('  Referer:', req.headers.referer);
  console.log('  Full session data:', req.session);
  console.log('---');
  next();
});

// Helper to get Facebook App credentials
async function getFacebookCredentials(user_id) {
  const user = await User.findById(user_id);
  console.log(user);
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

    // Must exactly match the URI whitelisted in your FB App settings
    const REDIRECT_URI = `https://socialsuit-backend-h9md.onrender.com/auth/facebook/callback`;

    const authURL = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read_insights,pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,pages_manage_metadata&response_type=code&state=${encodeURIComponent(user_id)}`;

    res.redirect(authURL);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Facebook callback with code
router.get('/facebook/callback', async (req, res) => {
  const { code, state } = req.query;
  const user_id = state;

  console.log('🔄 Callback received:', { code: !!code, state });

  try {
    const { clientId, clientSecret } = await getFacebookCredentials(user_id);
    const REDIRECT_URI = `https://socialsuit-backend-h9md.onrender.com/auth/facebook/callback`;

    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        code,
      }
    });

    const userAccessToken = tokenRes.data.access_token;
    console.log('🎫 Token received:', userAccessToken.substring(0, 20) + '...');

    // Store token in database instead of session for reliability
    const updatedUser = await User.findByIdAndUpdate(user_id, {
      facebookAccessToken: userAccessToken,
      facebookTokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      lastFacebookLogin: new Date()
    }, { new: true });

    console.log('✅ Token stored in database for user:', user_id);

    // Also store in session as backup
    req.session.userAccessToken = userAccessToken;
    req.session.user_id = user_id;
    
    console.log('💾 Before save - Session ID:', req.sessionID);
    console.log('💾 Before save - Session data:', req.session);

    // Force session save and wait for it
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          reject(err);
        } else {
          console.log('✅ Session saved successfully');
          console.log('✅ Session after save:', req.session);
          resolve();
        }
      });
    });

    // Redirect with user_id for frontend to store
    res.redirect(`https://hbg-vercel-yhjj.vercel.app/home?auth=success&user_id=${user_id}`);

  } catch (error) {
    console.error('❌ Error in callback:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

// 3. Fetch Facebook pages (updated with dual approach)
router.get('/facebook/pages', async (req, res) => {
  const { user_id } = req.query; // Get user_id from query parameter
  const sessionToken = req.session.userAccessToken;
  
  console.log("🔍 Session Token:", sessionToken);
  console.log("📦 Full session:", req.session);
  console.log("👤 User ID from query:", user_id);

  let token = sessionToken;
  let userId = req.session.user_id || user_id;

  // If session token not available, try database
  if (!token && user_id) {
    try {
      const user = await User.findById(user_id);
      if (user && user.facebookAccessToken) {
        // Check if token is expired
        if (!user.facebookTokenExpiry || new Date() < user.facebookTokenExpiry) {
          token = user.facebookAccessToken;
          userId = user_id;
          console.log('🎫 Using token from database:', token.substring(0, 20) + '...');
        } else {
          console.log('❌ Database token expired');
          return res.status(401).json({ error: 'Facebook token expired. Please authenticate again.' });
        }
      }
    } catch (dbError) {
      console.error('Database lookup error:', dbError);
    }
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'User not authenticated. Please provide user_id parameter or authenticate again.',
      suggestion: 'Call /auth/facebook?user_id=YOUR_USER_ID to authenticate'
    });
  }

  try {
    const pageRes = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${token}`);
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
          userId: userId // Associate with user
        },
        { upsert: true, new: true }
      );
    }

    const sanitizedPages = pages.map(({ access_token, ...rest }) => rest);
    res.json({ pages: sanitizedPages });
  } catch (err) {
    console.error('Error fetching pages:', err.response?.data || err.message);
    
    // Handle token validation errors
    if (err.response?.data?.error?.code === 190) {
      // Invalid token - clear from database and session
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $unset: { facebookAccessToken: 1, facebookTokenExpiry: 1 }
        });
      }
      req.session.userAccessToken = null;
      return res.status(401).json({ error: 'Invalid Facebook token. Please authenticate again.' });
    }
    
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// 4. Check authentication status
router.get('/facebook/status', async (req, res) => {
  const { user_id } = req.query;
  const sessionToken = req.session.userAccessToken;
  const sessionUserId = req.session.user_id;
  
  console.log('🔍 Auth status check:', { user_id, sessionUserId, hasSessionToken: !!sessionToken });
  
  let isAuthenticated = false;
  let tokenSource = null;
  let tokenExpiry = null;
  let lastLogin = null;

  // Check session first
  if (sessionToken && sessionUserId) {
    isAuthenticated = true;
    tokenSource = 'session';
  }
  
  // Check database if user_id provided
  if (user_id) {
    try {
      const user = await User.findById(user_id).select('facebookAccessToken facebookTokenExpiry lastFacebookLogin');
      
      if (user?.facebookAccessToken && (!user.facebookTokenExpiry || new Date() < user.facebookTokenExpiry)) {
        isAuthenticated = true;
        tokenSource = tokenSource === 'session' ? 'both' : 'database';
        tokenExpiry = user.facebookTokenExpiry;
        lastLogin = user.lastFacebookLogin;
      }
    } catch (err) {
      console.error('Error checking database auth:', err);
    }
  }
  
  res.json({
    authenticated: isAuthenticated,
    tokenSource,
    lastLogin,
    tokenExpiry,
    sessionId: req.sessionID,
    userId: sessionUserId || user_id
  });
});

// 5. Logout (updated)
router.get('/logout', async (req, res) => {
  const { user_id } = req.query;
  const sessionUserId = req.session.user_id;
  
  try {
    // Clear from database if user_id provided
    if (user_id || sessionUserId) {
      const targetUserId = user_id || sessionUserId;
      await User.findByIdAndUpdate(targetUserId, {
        $unset: { facebookAccessToken: 1, facebookTokenExpiry: 1 }
      });
      console.log('✅ Cleared Facebook token from database for user:', targetUserId);
    }
    
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Session logout failed' });
      }
      res.clearCookie('connect.sid');
      console.log('✅ Session destroyed');
      res.status(200).json({ message: 'Logged out successfully from both session and database' });
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// 6. Debug session route (enhanced)
router.get('/debug/session', (req, res) => {
  res.json({
    sessionID: req.sessionID,
    session: req.session,
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    referer: req.headers.referer
  });
});

module.exports = router;
