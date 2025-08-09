const express = require('express');
const router = express.Router();
const Song = require('../models/Song');

// GET /api/songs - Get all songs with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const songs = await Song.find()
      .sort({ searchCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Song.countDocuments();
    
    res.json({
      songs,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalSongs: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching songs', error: error.message });
  }
});

// GET /api/songs/search - Search songs
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const songs = await Song.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { artist: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);

    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error searching songs', error: error.message });
  }
});

// GET /api/songs/:id - Get a specific song
router.get('/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Increment search count
    song.searchCount += 1;
    await song.save();

    res.json(song);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching song', error: error.message });
  }
});

// POST /api/songs - Create a new song
router.post('/', async (req, res) => {
  try {
    const { title, artist, lyrics, source } = req.body;

    if (!title || !artist || !lyrics) {
      return res.status(400).json({ message: 'Title, artist, and lyrics are required' });
    }

    const song = new Song({
      title,
      artist,
      lyrics,
      source
    });

    const savedSong = await song.save();
    res.status(201).json(savedSong);
  } catch (error) {
    res.status(500).json({ message: 'Error creating song', error: error.message });
  }
});

module.exports = router;
