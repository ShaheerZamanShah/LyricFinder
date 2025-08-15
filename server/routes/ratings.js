const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'db_unavailable' });
    }
    const { spotify_id, title, artist, rating, userId } = req.body || {};
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 0 || r > 10) {
      return res.status(400).json({ error: 'rating must be between 0 and 10' });
    }
    const uid = (userId || '').trim();
    if (!uid) return res.status(400).json({ error: 'userId required' });
    const songKey = makeSongKey({ spotify_id, title, artist });
    if (!songKey) return res.status(400).json({ error: 'invalid song identity' });

    // If we have a spotify_id now, migrate any previous meta:title::artist ratings to the spotify key
    if (spotify_id) {
      try {
        const metaKey = makeSongKey({ title, artist });
        const spotifyKey = makeSongKey({ spotify_id });
        if (metaKey && spotifyKey && metaKey !== spotifyKey) {
          // Best-effort migration; ignore duplicate key errors
          await Rating.updateMany(
            { songKey: metaKey },
            { $set: { songKey: spotifyKey } }
          ).catch(() => {});
        }
      } catch {}
    }

    const doc = await Rating.findOneAndUpdate(
      { songKey, userId: uid },
      { $set: { rating: r }, $setOnInsert: { songKey, userId: uid, createdAt: new Date() } },
      { new: true, upsert: true }
    );

    // compute aggregate
    const agg = await Rating.aggregate([
      { $match: { songKey } },
      // Use $sum: 1 for count to support wider MongoDB versions
      { $group: { _id: '$songKey', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
  const avg = agg?.[0]?.avg;
  const count = agg?.[0]?.count || 0;
  const average = count > 0 && typeof avg === 'number' ? Number(avg.toFixed(2)) : null;
  return res.json({ ok: true, rating: doc.rating, average, count });
  } catch (err) {
    console.error('ratings post error:', err.message);
    return res.status(500).json({ error: 'failed to save rating' });
  }
});

// GET /api/ratings?spotify_id=...&title=...&artist=...
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'db_unavailable' });
    }
    const { spotify_id, title, artist } = req.query || {};
    const keys = [];
    const metaKey = makeSongKey({ title, artist });
    if (metaKey) keys.push(metaKey);
    if (spotify_id) {
      const sKey = makeSongKey({ spotify_id });
      if (sKey && !keys.includes(sKey)) keys.push(sKey);
    }
    const match = keys.length ? { songKey: { $in: keys } } : {};
    const agg = await Rating.aggregate([
      { $match: match },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const has = Array.isArray(agg) && agg.length > 0;
    const count = has ? (agg[0].count || 0) : 0;
    const average = count > 0 && typeof agg?.[0]?.avg === 'number' ? Number(agg[0].avg.toFixed(2)) : null;
    const canonicalKey = spotify_id ? makeSongKey({ spotify_id }) : metaKey;
    return res.json({ songKey: canonicalKey, average, count });
  } catch (err) {
    console.error('ratings get error:', err.message);
    return res.status(500).json({ error: 'failed to get ratings' });
  }
});

module.exports = router;
