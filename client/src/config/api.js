// API configuration for different environments - Updated for deployment
const API_CONFIG = {
  development: {
    BASE_URL: 'http://localhost:5000',
  },
  production: {
    BASE_URL: process.env.REACT_APP_API_URL || 'https://lyricfinder-production.up.railway.app',
  }
};

const currentConfig = API_CONFIG[process.env.NODE_ENV] || API_CONFIG.development;

export const API_BASE_URL = currentConfig.BASE_URL;
export const API_ENDPOINTS = {
  SEARCH_LYRICS: `${API_BASE_URL}/api/lyrics/search`,
  SPOTIFY_PREVIEW: `${API_BASE_URL}/api/spotify/preview`,
  SPOTIFY_SEARCH: `${API_BASE_URL}/api/spotify/search`,
  SPOTIFY_ME: `${API_BASE_URL}/api/spotify/me`,
  SPOTIFY_ME_TOP_TRACKS: `${API_BASE_URL}/api/spotify/me/top-tracks`,
  POPULAR_LYRICS: `${API_BASE_URL}/api/lyrics/popular`,
  GENIUS_DETAILS: `${API_BASE_URL}/api/lyrics/details`,
  SONGS: `${API_BASE_URL}/api/songs`,
  LASTFM_ARTIST: `${API_BASE_URL}/api/lastfm/artist`,
  SPOTIFY_AUTH: `${API_BASE_URL}/api/spotify/auth`,
  SPOTIFY_CALLBACK: `${API_BASE_URL}/api/spotify/callback`,
  SPOTIFY_RECOMMENDATIONS: `${API_BASE_URL}/api/spotify/recommendations`,
  SPOTIFY_AUDIO_FEATURES: `${API_BASE_URL}/api/spotify/audio-features`,
  SPOTIFY_AUDIO_FEATURES_BATCH: `${API_BASE_URL}/api/spotify/audio-features-batch`,
  SPOTIFY_ARTISTS: `${API_BASE_URL}/api/spotify/artists`,
  SPOTIFY_PLAYCOUNT: `${API_BASE_URL}/api/spotify/playcount`,
  YOUTUBE_LINK: `${API_BASE_URL}/api/youtube/link`,
  TRANSLITERATE: `${API_BASE_URL}/api/transliterate`,
  RATINGS: `${API_BASE_URL}/api/ratings`,
};

// For Judge page, use relative URLs to work with deployed frontend
export const JUDGE_API_ENDPOINTS = {
  SPOTIFY_AUTH: '/api/spotify/auth',
  SPOTIFY_ME: '/api/spotify/me',
  SPOTIFY_ME_TOP_TRACKS: '/api/spotify/me/top-tracks',
  SPOTIFY_AUDIO_FEATURES_BATCH: '/api/spotify/audio-features-batch',
  SPOTIFY_ARTISTS: '/api/spotify/artists',
};

export default API_CONFIG;
