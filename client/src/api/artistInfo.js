// Last.fm API integration for artist information via backend proxy
import { API_ENDPOINTS } from '../config/api';

export async function fetchArtistInfo(artistName) {
  try {
    // Use backend proxy to avoid CORS issues
    const apiUrl = `${API_ENDPOINTS.LASTFM_ARTIST}/${encodeURIComponent(artistName)}`;
    
    console.log('Fetching artist info for:', artistName);
    console.log('API URL:', apiUrl);
    
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      console.warn(`Last.fm API error: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    console.log('Artist data received:', data);
    
    if (data.error) {
      console.warn(`Last.fm API error: ${data.error}`);
      return null;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error fetching artist info:', error);
    
    // Fallback to direct API call if backend is not available
    return await fetchArtistInfoDirect(artistName);
  }
}

// Fallback direct API call
async function fetchArtistInfoDirect(artistName) {
  const apiKey = "62310b3f309e3584919d948cdc23b021";
  
  try {
    console.log('Trying direct Last.fm API call...');
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json&autocorrect=1`
    );
    
    if (!res.ok) {
      throw new Error(`Last.fm API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.error) {
      console.warn(`Last.fm API error: ${data.error} - ${data.message}`);
      return null;
    }
    
    if (data.artist) {
      // Clean up bio text by removing HTML tags and links
      const cleanBio = data.artist.bio?.summary
        ?.replace(/<a href="[^"]*">([^<]*)<\/a>/g, '$1') // Remove links but keep text
        ?.replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
        ?.trim() || "No biography available.";
      
      // Debug image URLs
      console.log('Last.fm artist images:', data.artist.image);
      const artistImage = data.artist.image?.[3]?.['#text'] || data.artist.image?.[2]?.['#text'] || null;
      console.log('Selected artist image:', artistImage);
      
      // Debug similar artists images
      if (data.artist.similar?.artist) {
        console.log('Similar artists with images:', data.artist.similar.artist.map(a => ({
          name: a.name,
          image: a.image?.[2]?.['#text'] || a.image?.[1]?.['#text'] || null
        })));
      }
      
      return {
        name: data.artist.name,
        bio: cleanBio,
        image: artistImage,
        tags: data.artist.tags?.tag?.slice(0, 8).map(t => t.name) || [], // Limit to 8 tags
        similar: data.artist.similar?.artist?.slice(0, 12).map(a => ({
          name: a.name,
          image: a.image?.[2]?.['#text'] || a.image?.[1]?.['#text'] || null // Try medium or small image
        })) || [] // Limit to 12 similar artists
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching artist info from Last.fm:', error);
    
    // If it's a CORS error, return a helpful message
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
      console.warn('CORS issue detected with Last.fm API. This is expected in development.');
    }
    
    return null;
  }
}
