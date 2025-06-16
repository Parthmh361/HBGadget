// routes/youtube.js
const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const fs = require('fs');
const router = express.Router();

// Middleware to handle file uploads
const upload = multer({ dest: 'uploads/' });

// Helper to extract token from Authorization header
function getAccessToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

// ✅ POST /api/youtube/schedule
router.post('/schedule', upload.single('video'), async (req, res) => {
   const accessToken = req.session.accessToken; // Get from session
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token missing or invalid' });
  }

  const { title, description, scheduledAt } = req.body;
  const videoFilePath = req.file?.path;

  if (!videoFilePath) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: { title, description },
        status: {
          privacyStatus: 'private',
          publishAt: new Date(scheduledAt).toISOString(),
          selfDeclaredMadeForKids: false,
        }
      },
      media: {
        body: fs.createReadStream(videoFilePath),
      }
    });

    fs.unlinkSync(videoFilePath); // ✅ Clean up uploaded file
    res.status(200).json({ message: 'Video scheduled successfully', videoId: response.data.id });

  } catch (error) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: 'Failed to schedule video' });
  }
});

// ✅ GET /api/youtube/uploads
router.get('/uploads', async (req, res) => {
   const accessToken = req.session.accessToken; // Get from session
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token missing or invalid' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    // Get the authenticated user's channel
    const channelResponse = await youtube.channels.list({
      part: 'contentDetails',
      mine: true,
    });

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Get videos from the uploads playlist
    const playlistItems = await youtube.playlistItems.list({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 10,
    });

    const videos = playlistItems.data.items.map((item) => ({
      id: item.snippet.resourceId.videoId,
      snippet: item.snippet,
    }));
    console.log('Fetched videos:', videos);
    res.json(videos);

  } catch (error) {
    console.error('Fetch uploads error:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});
// Add or update this route in routes/youtube.js
router.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  try {
    const { tokens } = await oauth2Client.getToken(code);
    req.session.accessToken = tokens.access_token; // Store in session
    // Redirect to your dashboard or home page
    res.redirect('https://hbg-vercel-yhjj.vercel.app/youtube');
  } catch (err) {
    res.status(400).json({ error: 'Failed to get tokens', details: err });
  }
});
// Add this at the top of routes/youtube.js
router.get('/auth-url', (req, res) => {
  console.log(process.env.GOOGLE_CLIENT_ID);
  const { google } = require('googleapis');
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    redirect_uri: process.env.GOOGLE_REDIRECT_URI
  });
  res.json({ url });
});
router.get('/check-auth', (req, res) => {
  if (req.session && req.session.accessToken) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});
module.exports = router;
