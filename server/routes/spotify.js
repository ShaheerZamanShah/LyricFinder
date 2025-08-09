const express = require('express');
const axios = require('axios');
const router = express.Router();

// Get Spotify client credentials token
router.post('/token', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ 
        error: 'Spotify credentials not configured' 
      });
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000 // 5 second timeout for token requests
      }
    );

    res.json({
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in
    });

  } catch (error) {
    console.error('Spotify token error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get Spotify access token',
      details: error.response?.data || error.message
    });
  }
});

// Search Spotify tracks
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 5000 // 5 second timeout for search requests
      }
    );

    const tracks = response.data.tracks.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      image: track.album?.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls?.spotify,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      spotify_id: track.id
    }));

    res.json({ tracks });

  } catch (error) {
    console.error('Spotify search error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to search Spotify',
      details: error.response?.data || error.message
    });
  }
});

// Get Spotify recommendations based on a track (alternative approach using search)
router.get('/recommendations', async (req, res) => {
  try {
    const { track_id, artist_name, limit = 6 } = req.query;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    console.log('Recommendations request:', { track_id, artist_name, limit, hasToken: !!accessToken });
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    let searchQueries = [];
    
    if (artist_name && artist_name.trim()) {
      // Create diverse search queries based on the artist
      const genres = ['pop', 'rock', 'indie', 'alternative', 'electronic', 'hip-hop', 'r&b', 'jazz', 'country'];
      const randomGenres = genres.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      // Add artist-related searches and genre-based searches
      searchQueries = [
        `artist:${artist_name.trim()}`,
        `genre:${randomGenres[0]}`,
        `genre:${randomGenres[1]}`,
        `year:2020-2024`, // Recent popular tracks
        `genre:${randomGenres[2]}`,
        'playlist:"Top 50"' // Popular playlists
      ];
    } else {
      // Default searches for variety
      searchQueries = [
        'year:2023-2024 genre:pop',
        'year:2022-2024 genre:rock',
        'year:2021-2024 genre:indie',
        'playlist:"Top 50"',
        'genre:electronic',
        'genre:alternative'
      ];
    }

    console.log('Search queries:', searchQueries);

    const allTracks = [];
    
    // Execute multiple searches to get variety
    for (const query of searchQueries.slice(0, 3)) { // Limit to 3 searches to avoid rate limits
      try {
        const response = await axios.get(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10&market=US`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            timeout: 3000 // 3 second timeout for recommendation searches
          }
        );

        if (response.data.tracks.items.length > 0) {
          allTracks.push(...response.data.tracks.items);
        }
      } catch (searchError) {
        console.error(`Search failed for query "${query}":`, searchError.response?.data || searchError.message);
      }
    }

    console.log(`Collected ${allTracks.length} tracks from searches`);

    if (allTracks.length === 0) {
      return res.status(404).json({ error: 'No recommendations found' });
    }

    // Remove duplicates and shuffle
    const uniqueTracks = [];
    const seenIds = new Set();
    
    for (const track of allTracks) {
      if (!seenIds.has(track.id)) {
        uniqueTracks.push(track);
        seenIds.add(track.id);
      }
    }

    // Shuffle and take random selection
    const shuffled = uniqueTracks.sort(() => 0.5 - Math.random());
    const selectedTracks = shuffled.slice(0, parseInt(limit));

    const recommendations = selectedTracks.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      album: track.album?.name || 'Unknown Album',
      image: track.album?.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls?.spotify,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      spotify_id: track.id
    }));

    console.log('Final recommendations:', recommendations.map(r => `${r.title} by ${r.artist}`));

    res.json({ recommendations });

  } catch (error) {
    console.error('Spotify recommendations error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get Spotify recommendations',
      details: error.response?.data || error.message
    });
  }
});

// Multi-source preview endpoint - handles CORS and token issues server-side
router.get('/preview', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    console.log('Getting preview for:', q);

    // Try Spotify first
    try {
      const spotifyPreview = await getSpotifyPreview(q);
      if (spotifyPreview && spotifyPreview.preview) {
        return res.json({ ...spotifyPreview, source: 'Spotify' });
      }
    } catch (spotifyError) {
      console.log('Spotify preview failed:', spotifyError.message);
    }

    // Try Deezer as fallback
    try {
      const deezerPreview = await getDeezerPreview(q);
      if (deezerPreview && deezerPreview.preview) {
        return res.json({ ...deezerPreview, source: 'Deezer' });
      }
    } catch (deezerError) {
      console.log('Deezer preview failed:', deezerError.message);
    }

    // Try iTunes as final fallback
    try {
      const itunesPreview = await getItunesPreview(q);
      if (itunesPreview && itunesPreview.preview) {
        return res.json({ ...itunesPreview, source: 'iTunes' });
      }
    } catch (itunesError) {
      console.log('iTunes preview failed:', itunesError.message);
    }

    // No preview found from any source
    res.json({ 
      preview: null, 
      cover: null, 
      spotifyUrl: null,
      spotifyId: null,
      source: 'none' 
    });

  } catch (error) {
    console.error('Preview endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get preview',
      details: error.message
    });
  }
});

// Helper functions for different preview sources
async function getSpotifyPreview(query) {
  try {
    // Get Spotify token
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000 // 5 second timeout for token requests
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Search for track with timeout
    const searchResponse = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 3000 // 3 second timeout
      }
    );

    if (searchResponse.data.tracks.items.length === 0) {
      return { preview: null };
    }

    const track = searchResponse.data.tracks.items[0];
    return {
      preview: track.preview_url,
      cover: track.album?.images[0]?.url,
      spotifyUrl: track.external_urls?.spotify,
      spotifyId: track.id
    };

  } catch (error) {
    console.error('Spotify preview error:', error.message);
    return { preview: null };
  }
}

async function getDeezerPreview(query) {
  try {
    const response = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'User-Agent': 'LyricFinder/1.0'
        },
        timeout: 3000 // 3 second timeout for Deezer
      }
    );

    if (response.data.data.length === 0) {
      return { preview: null };
    }

    const track = response.data.data[0];
    return {
      preview: track.preview,
      cover: track.album?.cover_medium || track.album?.cover,
      spotifyUrl: null,
      spotifyId: null
    };

  } catch (error) {
    console.error('Deezer preview error:', error.message);
    return { preview: null };
  }
}

async function getItunesPreview(query) {
  try {
    const response = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`,
      {
        headers: {
          'User-Agent': 'LyricFinder/1.0'
        },
        timeout: 3000 // 3 second timeout for iTunes
      }
    );

    if (response.data.results.length === 0) {
      return { preview: null };
    }

    const track = response.data.results[0];
    return {
      preview: track.previewUrl,
      cover: track.artworkUrl100?.replace('100x100', '600x600'),
      spotifyUrl: null,
      spotifyId: null
    };

  } catch (error) {
    console.error('iTunes preview error:', error.message);
    return { preview: null };
  }
}

// Get Spotify artist images
router.get('/artist/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;
    
    // Get Spotify access token
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Spotify credentials not configured' });
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Get access token with timeout
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000 // 5 second timeout for token requests
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Search for artist with timeout
    const searchResponse = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 3000 // 3 second timeout
      }
    );

    const artists = searchResponse.data.artists.items;
    
    if (artists.length === 0) {
      return res.json({ image: null, name: artistName });
    }

    const artist = artists[0];
    const image = artist.images?.[0]?.url || null; // Get highest resolution image

    console.log('Spotify artist image found:', {
      name: artist.name,
      hasImage: !!image,
      imageUrl: image
    });

    res.json({
      name: artist.name,
      image: image,
      spotify_id: artist.id,
      spotify_url: artist.external_urls?.spotify,
      followers: artist.followers?.total,
      genres: artist.genres
    });

  } catch (error) {
    console.error('Spotify artist error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get artist from Spotify',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
