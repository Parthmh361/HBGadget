const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
require('dotenv').config();

// Use multer memory storage so files are in `req.file.buffer`
const upload = multer({ storage: multer.memoryStorage() });

// Helper to upload photo to Facebook
async function uploadPhoto({ pageId, pageAccessToken, caption, buffer, filename, scheduledTime }) {
  const formData = new FormData();

  formData.append('access_token', pageAccessToken);
  if (caption) formData.append('caption', caption);
  formData.append('published', scheduledTime ? 'false' : 'true');
  if (scheduledTime) formData.append('scheduled_publish_time', scheduledTime);

  // Append the photo file buffer
  formData.append('source', buffer, {
    filename: filename || 'photo.jpg',
    contentType: 'image/jpeg',
  });

  const response = await axios.post(
    `https://graph.facebook.com/${pageId}/photos`,
    formData,
    { headers: formData.getHeaders() }
  );

  return response.data;
}

// Helper to upload video to Facebook
async function uploadVideo({ pageId, pageAccessToken, description, buffer, filename, scheduledTime },) {
  const formData = new FormData();

  formData.append('access_token', pageAccessToken);
  if (description) formData.append('description', description);
  formData.append('published', scheduledTime ? 'false' : 'true');
  if (scheduledTime) formData.append('scheduled_publish_time', scheduledTime);

  // Append the video file buffer
  formData.append('source', buffer, {
    filename: filename || 'video.mp4',
    contentType: 'video/mp4',
  });

  const response = await axios.post(
    `https://graph.facebook.com/${pageId}/videos`,
    formData,
    { headers: formData.getHeaders() }
  );

  return response.data;
}

/**
 * Route: POST /schedulePost/timing
 * Schedule photo or video post with uploaded file
 * Expects multipart/form-data with fields:
 * - pageId (string)
 * - pageAccessToken (string)
 * - message or caption (string)
 * - scheduledTime (Unix timestamp in seconds)
 * - mediaType ('photo' or 'video')
 * - file (photo/video file)
 */
router.post('/timing', upload.single('file'), async (req, res) => {
  try {
    const {
      pageId,
      pageAccessToken,
      caption,
      message,
      scheduledTime,
      mediaType,
    } = req.body;

    if (!pageId || !pageAccessToken || !req.file) {
      return res.status(400).json({ error: 'Missing required fields or file' });
    }

    const unixScheduledTime = parseInt(scheduledTime);
    if (isNaN(unixScheduledTime)) {
      return res.status(400).json({ error: 'Invalid scheduledTime' });
    }

    let responseData;

    if (mediaType === 'video') {
      responseData = await uploadVideo({
        pageId,
        pageAccessToken,
        description: caption || message,
        buffer: req.file.buffer,
        filename: req.file.originalname,
        scheduledTime: unixScheduledTime,
      });
    } else {
      // Default to photo
      responseData = await uploadPhoto({
        pageId,
        pageAccessToken,
        caption: caption || message,
        buffer: req.file.buffer,
        filename: req.file.originalname,
        scheduledTime: unixScheduledTime,
      });
    }

    res.status(200).json({ success: true, postId: responseData.id || responseData.post_id || null });
  } catch (error) {
    console.error('Schedule Post Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

/**
 * Route: POST /schedulePost/instantly
 * Post photo or video immediately with uploaded file
 * Expects multipart/form-data with fields:
 * - pageId (string)
 * - pageAccessToken (string)
 * - message or caption (string)
 * - mediaType ('photo' or 'video')
 * - file (photo/video file)
 */
router.post('/instantly', upload.single('file'), async (req, res) => {
  try {
    const {
      pageId,
      pageAccessToken,
      caption,
      message,
      mediaType,
    } = req.body;

    if (!pageId || !pageAccessToken || !req.file) {
      return res.status(400).json({ error: 'Missing required fields or file' });
    }

    let responseData;

    if (mediaType === 'video') {
      responseData = await uploadVideo({
        pageId,
        pageAccessToken,
        description: caption || message,
        buffer: req.file.buffer,
        filename: req.file.originalname,
      });
    } else {
      // Default to photo
      responseData = await uploadPhoto({
        pageId,
        pageAccessToken,
        caption: caption || message,
        buffer: req.file.buffer,
        filename: req.file.originalname,
      });
    }

    res.status(200).json({ success: true, postId: responseData.id || responseData.post_id || null });
  } catch (error) {
    console.error('Instant Post Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to post instantly' });
  }
});


module.exports = router;
