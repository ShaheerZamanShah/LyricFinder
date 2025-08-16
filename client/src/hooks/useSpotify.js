import { useState, useEffect } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import SpotifyWebApi from 'spotify-web-api-js';

const spotifyApi = new SpotifyWebApi();

const useSpotify = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  // Note: public client id not used here; server proxies Spotify calls

  useEffect(() => {
    // Get access token from URL if redirected from Spotify
    const hash = window.location.hash;
    let token = window.localStorage.getItem("spotify_token");

    if (!token && hash) {
      token = hash.substring(1).split("&").find(elem => elem.startsWith("access_token")).split("=")[1];
      window.location.hash = "";
      window.localStorage.setItem("spotify_token", token);
    }

    if (token) {
      setAccessToken(token);
      setIsAuthenticated(true);
      spotifyApi.setAccessToken(token);
    } else {
      // Get client credentials token for search without user auth
      getClientCredentialsToken();
    }
  }, []);

  const getClientCredentialsToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/spotify/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 429) {
        // Rate limited
        console.error('Spotify API rate limit reached. Please try again later.');
        alert('Spotify API rate limit reached. Please try again later.');
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        // If response is not valid JSON, show error
        console.error('Spotify token response is not valid JSON:', jsonErr);
        alert('Spotify token response is not valid JSON. Please try again later.');
        return;
      }

      if (data.access_token) {
        setAccessToken(data.access_token);
        spotifyApi.setAccessToken(data.access_token);
        setIsAuthenticated(true);
      } else if (data.error) {
        console.error('Error getting Spotify token:', data.error);
        alert('Error getting Spotify token: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error getting Spotify token:', error);
      alert('Error getting Spotify token. Please try again later.');
    }
  };

  const authorizeUser = () => {
    const clientId = '9124e833ec0b41559b46312aaed4c3c5';
    const REDIRECT_URI = `${window.location.origin}/callback`;
    const scopes = [
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-library-read',
      'playlist-read-private',
      'playlist-read-collaborative'
    ];

  window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${REDIRECT_URI}&scope=${scopes.join('%20')}&response_type=token&show_dialog=true`;
  };

  const searchSpotifyTracks = async (query) => {
    if (!accessToken) {
      throw new Error('No Spotify access token available');
    }

    try {
      const results = await spotifyApi.searchTracks(query, { limit: 10 });
      
      return results.tracks.items.map(track => ({
        id: track.id,
        title: track.name,
  artist: track.artists[0]?.name || 'Unknown Artist',
  artists: (track.artists || []).map(a => ({ id: a.id, name: a.name, spotify_url: a.external_urls?.spotify })),
        album: track.album?.name || 'Unknown Album',
        image: track.album?.images[0]?.url || null,
        preview_url: track.preview_url,
        external_url: track.external_urls?.spotify,
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        spotify_id: track.id
      }));
    } catch (error) {
      console.error('Spotify search error:', error);
      throw error;
    }
  };

  const getCurrentUserPlaylists = async () => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    try {
      const playlists = await spotifyApi.getUserPlaylists();
      return playlists.items;
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  };

  const getRecommendations = async (trackId, artistName, title) => {
    if (!accessToken) {
      throw new Error('No Spotify access token available');
    }

    try {
      const params = new URLSearchParams();
      if (trackId) {
        params.append('track_id', trackId);
      }
      if (artistName) {
        params.append('artist_name', artistName);
      }
      if (title) {
        params.append('title', title);
      }
  params.append('limit', '10');

      const response = await fetch(`${API_ENDPOINTS.SPOTIFY_RECOMMENDATIONS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
  return data.recommendations;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  };

  const logout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
    window.localStorage.removeItem("spotify_token");
    spotifyApi.setAccessToken(null);
  };

  return {
    isAuthenticated,
    accessToken,
    authorizeUser,
    searchSpotifyTracks,
    getCurrentUserPlaylists,
    getRecommendations,
    logout
  };
};

export default useSpotify;
