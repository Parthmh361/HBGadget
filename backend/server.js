const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const session = require('express-session');
const app = express();

// ✅ Only this correct CORS setup should be used
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Session setup
app.use(session({
  secret: 'secure-facebook-login',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
  },
}));

// ✅ Routes
const authRoutes = require('./routes/AuthRoutes');
const EditPostsRoutes = require('./routes/EditPostsRoutes');
const SchedulePostRoutes = require('./routes/SchedulePostRoutes');
const GetPostRoutes = require('./routes/getPostRoutes');

app.use('/auth', authRoutes);
app.use('/schedulePost', SchedulePostRoutes);
app.use('/posts', GetPostRoutes);
app.use('/editPost', EditPostsRoutes);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
