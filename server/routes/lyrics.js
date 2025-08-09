const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const Song = require('../models/Song');

// Genius API configuration
const GENIUS_API_BASE_URL = 'https://api.genius.com';
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_API_KEY;

// Function to clean and format lyrics properly
const cleanAndFormatLyrics = (rawLyrics) => {
  let cleaned = rawLyrics;
  
  // Remove unwanted content that appears on Genius pages
  cleaned = cleaned.replace(/\d+\s*Contributors?.*?(?=\[|$)/gi, '');
  cleaned = cleaned.replace(/Translations.*?(?=\[|$)/gi, '');
  cleaned = cleaned.replace(/Türkçe|Español|Русский|Português|Français|Deutsch|Česky|Polski/gi, '');
  cleaned = cleaned.replace(/Lyrics.*?(?=\[|$)/gi, '');
  cleaned = cleaned.replace(/<img[^>]*>/gi, '');
  cleaned = cleaned.replace(/Read More.*?(?=\[|$)/gi, '');
  cleaned = cleaned.replace(/You might also like/gi, '');
  cleaned = cleaned.replace(/Embed/gi, '');
  cleaned = cleaned.replace(/See .*? Live/gi, '');
  cleaned = cleaned.replace(/Get tickets as low as \$\d+/gi, '');
  
  // Clean up extra whitespace and format properly
  cleaned = cleaned.replace(/\s{3,}/g, '\n\n'); // Replace multiple spaces with line breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Replace multiple line breaks with double line breaks
  
  // Ensure proper formatting for song sections
  cleaned = cleaned.replace(/(\[(?:Verse|Chorus|Bridge|Pre-Chorus|Intro|Outro|Hook|Refrain)[^\]]*\])/gi, '\n$1\n');
  
  // Clean up any remaining HTML-like content
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  
  // Remove extra spaces and normalize
  cleaned = cleaned.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
  cleaned = cleaned.replace(/\n /g, '\n'); // Remove spaces at beginning of lines
  cleaned = cleaned.replace(/ \n/g, '\n'); // Remove spaces at end of lines
  
  // Final cleanup
  cleaned = cleaned.trim();
  
  return cleaned;
};

// Search for lyrics using Genius API
const searchLyricsWithGenius = async (songTitle, artist) => {
  try {
    // Step 1: Search for the song on Genius with timeout
    const searchQuery = `${songTitle} ${artist}`;
    const searchResponse = await axios.get(`${GENIUS_API_BASE_URL}/search`, {
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
      },
      params: {
        q: searchQuery
      },
      timeout: 8000 // 8 second timeout to prevent hanging
    });

    const hits = searchResponse.data.response.hits;
    
    if (!hits || hits.length === 0) {
      throw new Error('Song not found on Genius');
    }

    // Get the first matching song
    const song = hits[0].result;
    const songUrl = song.url;
    
    // Step 2: Scrape lyrics from the Genius page with timeout
    const lyricsResponse = await axios.get(songUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 second timeout for page scraping
    });

    const $ = cheerio.load(lyricsResponse.data);
    
    // Extract lyrics from Genius page structure
    let lyrics = '';
    
    // Try different selectors that Genius uses for lyrics
    const lyricsSelectors = [
      '[data-lyrics-container="true"]',
      '.lyrics',
      '[class*="Lyrics__Container"]',
      '[class*="lyrics"]'
    ];

    for (const selector of lyricsSelectors) {
      const lyricsElement = $(selector);
      if (lyricsElement.length > 0) {
        // Extract text and clean it up properly
        lyrics = lyricsElement.text();
        break;
      }
    }

    if (!lyrics) {
      // Fallback: try to extract from any div containing lyrics-like content
      $('div').each((i, element) => {
        const text = $(element).text();
        if (text.includes('[Verse') || text.includes('[Chorus') || text.length > 200) {
          lyrics = text;
          return false; // break the loop
        }
      });
    }

    if (lyrics) {
      // Clean and format the lyrics properly
      lyrics = cleanAndFormatLyrics(lyrics);
    }

    if (!lyrics || lyrics.length < 50) {
      throw new Error('Could not extract lyrics from Genius page');
    }

    return {
      lyrics: lyrics,
      source: 'Genius API',
      confidence: 0.95,
      geniusUrl: songUrl,
      songTitle: song.title,
      artistName: song.primary_artist.name
    };

  } catch (error) {
    console.error('Genius API error:', error.message);
    
    // Always fallback to alternative method for any Genius API error
    console.log('Falling back to alternative lyrics API...');
    return await searchLyricsAlternative(songTitle, artist);
  }
};

// Alternative lyrics search method (using a free lyrics API)
const searchLyricsAlternative = async (songTitle, artist) => {
  try {
    // Using lyrics.ovh API as a fallback (free, no auth required) with faster timeout
    const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(songTitle)}`, {
      timeout: 7000 // Reduced from 10s to 7s for faster fallback
    });

    if (response.data && response.data.lyrics) {
      return {
        lyrics: response.data.lyrics.trim(),
        source: 'Lyrics.ovh API',
        confidence: 0.85
      };
    } else {
      throw new Error('No lyrics found');
    }
  } catch (error) {
    console.error('Alternative lyrics API error:', error.message);
    
    // Last fallback: return a helpful message
    return {
      lyrics: `Lyrics for "${songTitle}" by ${artist} could not be found.

This could be due to:
• The song might not be in our database
• Copyright restrictions
• API rate limits
• Network connectivity issues

Please try:
• Checking the song title and artist spelling
• Searching for a different version or remix
• Trying again in a few minutes

Note: To get better results, please add a valid Genius API key to your environment variables.`,
      source: 'System Message',
      confidence: 0.0
    };
  }
};

// POST /api/lyrics/search - Search for lyrics using Genius API
router.post('/search', async (req, res) => {
  try {
    const { title, artist } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ message: 'Title and artist are required' });
    }

    let existingSong = null;
    
    // Try to check database for existing song (but don't fail if MongoDB is down)
    try {
      existingSong = await Song.findOne({
        title: { $regex: new RegExp(title, 'i') },
        artist: { $regex: new RegExp(artist, 'i') }
      });

      if (existingSong) {
        // Update search count
        existingSong.searchCount += 1;
        await existingSong.save();
        
        return res.json({
          song: existingSong,
          cached: true
        });
      }
    } catch (dbError) {
      console.log('Database query failed, proceeding without cache:', dbError.message);
    }

    // If not found in database or database is unavailable, search using Genius API
    const lyricsData = await searchLyricsWithGenius(title, artist);

    // Try to save to database (but don't fail if MongoDB is down)
    let savedSong = null;
    try {
      const newSong = new Song({
        title,
        artist,
        lyrics: lyricsData.lyrics,
        source: lyricsData.source,
        searchCount: 1
      });

      savedSong = await newSong.save();
    } catch (dbError) {
      console.log('Failed to save to database, returning lyrics without caching:', dbError.message);
      // Create a mock song object for response
      savedSong = {
        _id: 'temp-' + Date.now(),
        title,
        artist,
        lyrics: lyricsData.lyrics,
        source: lyricsData.source,
        searchCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    res.json({
      song: savedSong,
      cached: false,
      confidence: lyricsData.confidence,
      note: savedSong._id.toString().startsWith('temp-') ? 'Database unavailable - lyrics not cached' : undefined
    });

  } catch (error) {
    console.error('Lyrics search error:', error);
    res.status(500).json({ 
      message: 'Error searching for lyrics', 
      error: error.message 
    });
  }
});

// GET /api/lyrics/popular - Get most searched songs
router.get('/popular', async (req, res) => {
  try {
    const popularSongs = await Song.find()
      .sort({ searchCount: -1 })
      .limit(10)
      .select('title artist searchCount');

    res.json(popularSongs);
  } catch (error) {
    console.log('Database query failed for popular songs:', error.message);
    res.json([]); // Return empty array if database is unavailable
  }
});

module.exports = router;
