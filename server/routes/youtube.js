const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/youtube/link?q=title artist
// Optionally uses process.env.YOUTUBE_API_KEY to fetch the best matching YouTube video.
router.get('/link', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q.trim()) {
      return res.status(400).json({ error: 'Query required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      // No API key configured; return null so client can fallback to search page
      return res.json({ url: null });
    }

    // Prefer "official audio" or "official video" matches
    const queries = [
      `${q} official audio`,
      `${q} official video`,
      q
    ];

    for (const query of queries) {
      try {
        const resp = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: apiKey,
            part: 'snippet',
            type: 'video',
            maxResults: 1,
            q: query
          },
          timeout: 8000
        });

        const item = resp.data?.items?.[0];
        const videoId = item?.id?.videoId;
        if (videoId) {
          return res.json({ url: `https://www.youtube.com/watch?v=${videoId}` });
        }
      } catch (err) {
        // try next query
      }
    }

    return res.json({ url: null });
  } catch (error) {
    console.error('YouTube link error:', error.message);
    return res.status(500).json({ error: 'Failed to resolve YouTube link' });
  }
});

module.exports = router;
