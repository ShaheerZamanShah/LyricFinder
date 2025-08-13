const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');

// Helper to normalize a song key
function makeSongKey({ spotify_id, title, artist }) {
  if (spotify_id) return `spotify:${spotify_id}`;
  const t = (title || '').trim().toLowerCase();
  const a = (artist || '').trim().toLowerCase();
  return `meta:${t}::${a}`;
}

// POST /api/ratings -> { spotify_id?, title, artist, rating, userId }
router.post('/', async (req, res) => {
  try {
    const { spotify_id, title, artist, rating, userId } = req.body || {};
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 0 || r > 10) {
      return res.status(400).json({ error: 'rating must be between 0 and 10' });
    }
    const uid = (userId || '').trim();
    if (!uid) return res.status(400).json({ error: 'userId required' });
    const songKey = makeSongKey({ spotify_id, title, artist });
    if (!songKey) return res.status(400).json({ error: 'invalid song identity' });

    const doc = await Rating.findOneAndUpdate(
      { songKey, userId: uid },
      { $set: { rating: r }, $setOnInsert: { songKey, userId: uid, createdAt: new Date() } },
      { new: true, upsert: true }
    );

    // compute aggregate
    const agg = await Rating.aggregate([
      { $match: { songKey } },
      { $group: { _id: '$songKey', avg: { $avg: '$rating' }, count: { $count: {} } } }
    ]);
    const avg = agg?.[0]?.avg || 0;
    const count = agg?.[0]?.count || 0;
    return res.json({ ok: true, rating: doc.rating, average: Number(avg.toFixed(2)), count });
  } catch (err) {
    console.error('ratings post error:', err.message);
    return res.status(500).json({ error: 'failed to save rating' });
  }
});

// GET /api/ratings?spotify_id=...&title=...&artist=...
router.get('/', async (req, res) => {
  try {
    const { spotify_id, title, artist } = req.query || {};
    const songKey = makeSongKey({ spotify_id, title, artist });
    const agg = await Rating.aggregate([
      { $match: { songKey } },
      { $group: { _id: '$songKey', avg: { $avg: '$rating' }, count: { $count: {} } } }
    ]);
    const average = agg?.[0]?.avg || 0;
    const count = agg?.[0]?.count || 0;
    return res.json({ songKey, average: Number(average.toFixed(2)), count });
  } catch (err) {
    console.error('ratings get error:', err.message);
    return res.status(500).json({ error: 'failed to get ratings' });
  }
});

module.exports = router;
