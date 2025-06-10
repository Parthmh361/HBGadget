const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const router = express.Router();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const EditPostsRoutes = require('./routes/EditPostsRoutes');
const SchedulePostRoutes = require('./routes/SchedulePostRoutes');
const GetPostRoutes = require('./routes/getPostRoutes');
app.use('/schedulePost', SchedulePostRoutes);
app.use('/posts',GetPostRoutes);
app.use('/editPost', EditPostsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
