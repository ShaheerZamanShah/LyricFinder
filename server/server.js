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
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS: allow credentials for cookie-based flows (e.g., Spotify OAuth cookies)
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://lyric-finder-alpha.vercel.app';
const corsOptions = {
  origin: function(origin, callback) {
    // Allow no-origin (same-origin or server-to-server) and configured frontend URL; otherwise allow localhost for dev
    if (!origin) return callback(null, true);
    if (FRONTEND_URL && origin === FRONTEND_URL) return callback(null, true);
    if (/^https?:\/\/localhost(?::\d+)?$/.test(origin)) return callback(null, true);
    // Allow Vercel preview URLs
    if (origin && origin.includes('vercel.app')) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting already applied above

// MongoDB connection – supports real DB via MONGODB_URI or in-memory for local testing via USE_MEMORY_DB=1
let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lyricfinder';

  const rateLimit = require('express-rate-limit');
  const NodeCache = require('node-cache');
  const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  app.use('/api/', limiter);
async function initDatabase() {
  try {
    if (process.env.USE_MEMORY_DB === '1') {
      // Lazy load to avoid bundling when not used
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mem = await MongoMemoryServer.create();
      mongoUri = mem.getUri();
      console.log('[DB] Using in-memory MongoDB at', mongoUri);
    } else {
      console.log('[DB] Using configured MongoDB URI');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.log('MongoDB connection error:', err.message);
    console.log('Note: The app will still work, but server-side persistence (e.g., ratings, cache) is disabled until DB is available.');
  }
}

// Fire-and-forget DB init (routes will return 503 until connected)
initDatabase();

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
