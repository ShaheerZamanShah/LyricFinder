const express = require('express');
const router = express.Router();
const axios = require('axios');

// Function to get Spotify artist image
async function getSpotifyArtistImage(artistName) {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return null;
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Get access token
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Search for artist
    const searchResponse = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const artists = searchResponse.data.artists.items;
    
    if (artists.length === 0) {
      return null;
    }

    const artist = artists[0];
    return artist.images?.[0]?.url || null; // Get highest resolution image

  } catch (error) {
    console.error('Spotify fallback error:', error.message);
    return null;
  }
}

// Last.fm Artist Info endpoint
router.get('/artist/:artistName', async (req, res) => {
  try {
    const { artistName } = req.params;
    const apiKey = "62310b3f309e3584919d948cdc23b021";
    
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&autocorrect=1`
    );
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Last.fm API error' });
    }
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.message });
    }
    
    if (data.artist) {
      // Clean up bio text
      const cleanBio = data.artist.bio?.summary
        ?.replace(/<a href="[^"]*">([^<]*)<\/a>/g, '$1')
        ?.replace(/<[^>]*>/g, '')
        ?.trim() || "No biography available.";
      
      // Filter out Last.fm default placeholder images
      const isValidImage = (imageUrl) => {
        if (!imageUrl) return false;
        // Common Last.fm placeholder image patterns
        const placeholderPatterns = [
          '2a96cbd8b46e442fc41c2b86b821562f.png',  // Common default
          'c6f59c1e5e7240a4c0d427abd71f3dbb.png',  // Another default
          '4128a6eb29f94943c9d206c08e625904.jpg',  // Another default
        ];
        return !placeholderPatterns.some(pattern => imageUrl.includes(pattern));
      };
      
      // Get main artist image, filter out placeholders
      let mainImage = null;
      const images = data.artist.image || [];
      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i]?.['#text'];
        if (isValidImage(img)) {
          mainImage = img;
          break;
        }
      }
      
      // If no valid Last.fm image, try Spotify
      if (!mainImage) {
        console.log('No valid Last.fm image, trying Spotify for:', data.artist.name);
        mainImage = await getSpotifyArtistImage(data.artist.name);
      }
      
      // Process similar artists in parallel batches for better performance
      const similarArtists = data.artist.similar?.artist?.slice(0, 12) || [];
      const batchSize = 4; // Process 4 at a time to avoid overwhelming APIs
      const processedSimilar = [];
      
      for (let i = 0; i < similarArtists.length; i += batchSize) {
        const batch = similarArtists.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(batch.map(async (a) => {
          // Filter similar artist images too
          let artistImage = null;
          const artistImages = a.image || [];
          for (let j = artistImages.length - 1; j >= 0; j--) {
            const img = artistImages[j]?.['#text'];
            if (isValidImage(img)) {
              artistImage = img;
              break;
            }
          }
          
          // If no valid Last.fm image for similar artist, try Spotify (with timeout)
          if (!artistImage) {
            try {
              artistImage = await Promise.race([
                getSpotifyArtistImage(a.name),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
              ]);
            } catch (error) {
              console.log(`Spotify image fetch failed for ${a.name}:`, error.message);
              artistImage = null;
            }
          }
          
          return {
            name: a.name,
            image: artistImage // Last.fm image or Spotify fallback
          };
        }));
        
        processedSimilar.push(...batchResults);
      }

      const result = {
        name: data.artist.name,
        bio: cleanBio,
        image: mainImage, // Last.fm image or Spotify fallback
        tags: data.artist.tags?.tag?.slice(0, 8).map(t => t.name) || [],
        similar: processedSimilar
      };
      
      console.log('Artist data processed:', {
        name: result.name,
        hasValidImage: !!result.image,
        imageUrl: result.image,
        similarCount: result.similar.length,
        similarWithImages: result.similar.filter(s => s.image).length
      });
      
      res.json(result);
    } else {
      res.status(404).json({ error: 'Artist not found' });
    }
    
  } catch (error) {
    console.error('Last.fm API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Image proxy endpoint to handle CORS issues
router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url || !url.startsWith('https://lastfm.freetls.fastly.net/')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Get the image data as a buffer
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);
    
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/png',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send the image data
    res.send(buffer);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

module.exports = router;
