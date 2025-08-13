const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express(); // create app first

// Tell Express to trust Railway's reverse proxy
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});
app.use(limiter);

// MongoDB connection – use provided MONGODB_URI and log status
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lyricfinder';
mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.log('MongoDB connection error:', err.message);
    console.log('Note: The app will still work, but server-side persistence (e.g., ratings, cache) is disabled until DB is available.');
  });

// Routes
app.use('/api/songs', require('./routes/songs'));
app.use('/api/lyrics', require('./routes/lyrics'));
app.use('/api/spotify', require('./routes/spotify'));
app.use('/api/lastfm', require('./routes/lastfm'));
app.use('/api/youtube', require('./routes/youtube'));
app.use('/api/transliterate', require('./routes/transliterate'));
app.use('/api/ratings', require('./routes/ratings'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server immediately; ratings route will return 503 if DB is unavailable
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${mongoUri ? '[set]' : '[missing]'}`);
});
