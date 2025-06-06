const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post('/schedule-post', async (req, res) => {
  const { pageId, pageAccessToken, message, scheduledTime } = req.body;

  try {
    const response = await axios.post(`https://graph.facebook.com/${pageId}/feed`, {
      message,
      published: false,
      scheduled_publish_time: scheduledTime,
      access_token: pageAccessToken,
    });

    res.status(200).json({ success: true, postId: response.data.id });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

app.post('/schedulepost', async (req, res) => {
  const { pageId, pageAccessToken, message} = req.body;
    
  try {
    const response = await axios.post(`https://graph.facebook.com/${pageId}/feed`, {
      message,
      published: true,
      access_token: pageAccessToken,
    });

    res.status(200).json({ success: true, postId: response.data.id });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
