require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const MongoStore = require('connect-mongo');

const app = express();

// CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'secure-facebook-login',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/userauth', require('./routes/Auth'));
app.use('/auth', require('./routes/AuthRoutes'));
app.use('/schedulePost', require('./middlewares/userAuthMiddleware'), require('./routes/SchedulePostRoutes'));
app.use('/posts', require('./middlewares/userAuthMiddleware'), require('./routes/getPostRoutes'));
app.use('/editPost', require('./middlewares/userAuthMiddleware'), require('./routes/EditPostsRoutes'));
app.use('/insights', require('./middlewares/userAuthMiddleware'), require('./routes/InsightsRoutes'));
app.use('/api/youtube', require('./routes/youtube'));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('     ==> Your service is live 🎉');
});
