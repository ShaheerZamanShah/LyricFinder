const express = require('express');
const axios = require('axios');
const router = express.Router();

// --- Helpers for OAuth cookies and URLs ---
function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      acc[k] = v;
    }
    return acc;
  }, {});
}

function getCookie(req, name) {
  const all = parseCookies(req);
  return all[name];
}

function setCookie(res, name, value, opts = {}) {
  const {
    httpOnly = true,
    sameSite = 'Lax',
    secure = process.env.NODE_ENV === 'production',
    maxAge, // ms
    path = '/',
  } = opts;
  let cookie = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  if (typeof maxAge === 'number') cookie += `; Max-Age=${Math.floor(maxAge / 1000)}`;
  res.setHeader('Set-Cookie', [...(Array.isArray(res.getHeader('Set-Cookie')) ? res.getHeader('Set-Cookie') : res.getHeader('Set-Cookie') ? [res.getHeader('Set-Cookie')] : []), cookie]);
}

function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}

function getServerBaseUrl(req) {
  // Prefer explicit env var, else infer
  const fromEnv = process.env.SERVER_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function getFrontendUrl(req) {
  const fromEnv = process.env.FRONTEND_URL;
  if (fromEnv) return fromEnv;
  // Default to root of same origin
  return '/';
}

async function refreshSpotifyAccessToken(refreshToken, clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const params = new URLSearchParams();
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', refreshToken);
  const resp = await axios.post(
    'https://accounts.spotify.com/api/token',
    params.toString(),
    { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return resp.data; // { access_token, token_type, scope, expires_in, refresh_token? }
}

// --- User OAuth: start auth flow ---
router.get('/auth', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${getServerBaseUrl(req)}/api/spotify/callback`;
    if (!clientId) return res.status(500).json({ error: 'Spotify client ID not configured' });
    const scope = 'user-top-read';

    // CSRF state
    const state = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    setCookie(res, 'spotify_oauth_state', state, { maxAge: 10 * 60 * 1000 });

    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', clientId);
    params.set('scope', scope);
    params.set('redirect_uri', redirectUri);
    params.set('state', state);

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    res.redirect(url);
  } catch (e) {
    console.error('Spotify auth error:', e.message);
    res.status(500).json({ error: 'Failed to start Spotify auth' });
  }
});

// --- OAuth callback & token exchange ---
router.get('/callback', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${getServerBaseUrl(req)}/api/spotify/callback`;
    if (!clientId || !clientSecret) return res.status(500).send('Spotify credentials not configured');

    const { code, state } = req.query;
    const stateCookie = getCookie(req, 'spotify_oauth_state');
    if (!state || !stateCookie || state !== stateCookie) {
      return res.status(400).send('Invalid OAuth state');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', redirectUri);

    const tokenResp = await axios.post(
      'https://accounts.spotify.com/api/token',
      params.toString(),
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

  const { access_token, refresh_token, expires_in } = tokenResp.data || {};
    if (!access_token) return res.status(502).send('No access token from Spotify');

  // Set cookies (SameSite=None + Secure for cross-site requests)
  setCookie(res, 'spotify_access_token', access_token, { maxAge: (expires_in || 3600) * 1000, sameSite: 'None', secure: true });
  if (refresh_token) setCookie(res, 'spotify_refresh_token', refresh_token, { maxAge: 30 * 24 * 3600 * 1000, sameSite: 'None', secure: true });
    // Clear state cookie
    clearCookie(res, 'spotify_oauth_state');

    const frontend = getFrontendUrl(req);
    // Redirect to Judge page by default
    const redirectTarget = frontend === '/' ? '/judge' : `${frontend.replace(/\/$/, '')}/judge`;
    res.redirect(redirectTarget);
  } catch (e) {
    console.error('Spotify callback error:', e.response?.data || e.message);
    res.status(500).send('Spotify OAuth failed');
  }
});

// --- Current user profile (check auth) ---
router.get('/me', async (req, res) => {
  try {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '') || getCookie(req, 'spotify_access_token');
    if (!bearer) return res.status(401).json({ error: 'Not authenticated' });
    const r = await axios.get('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${bearer}` } });
    res.json(r.data);
  } catch (e) {
    const status = e.response?.status || 500;
    if (status === 401) return res.status(401).json({ error: 'Unauthorized' });
    console.error('Spotify me error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// --- User top tracks with refresh handling ---
router.get('/me/top-tracks', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    let accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || getCookie(req, 'spotify_access_token');
    const refreshToken = getCookie(req, 'spotify_refresh_token');
    if (!accessToken && !refreshToken) return res.status(401).json({ error: 'Not authenticated' });

    async function fetchTop(token) {
      return axios.get(`https://api.spotify.com/v1/me/top/tracks?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
    }

    try {
      const r = await fetchTop(accessToken);
      return res.json(r.data);
    } catch (e) {
      if (e.response?.status === 401 && refreshToken && clientId && clientSecret) {
        try {
          const refreshed = await refreshSpotifyAccessToken(refreshToken, clientId, clientSecret);
          if (refreshed.access_token) {
            accessToken = refreshed.access_token;
            setCookie(res, 'spotify_access_token', accessToken, { maxAge: (refreshed.expires_in || 3600) * 1000 });
            const r2 = await fetchTop(accessToken);
            return res.json(r2.data);
          }
        } catch (rf) {
          console.warn('Spotify refresh failed:', rf.response?.data || rf.message);
        }
      }
      const status = e.response?.status || 500;
      return res.status(status).json({ error: 'Failed to fetch top tracks' });
    }
  } catch (e) {
    console.error('Top tracks error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Failed to fetch top tracks' });
  }
});

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
        }
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

// Search Spotify tracks (simplified endpoint with built-in auth)
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Use Spotify credentials from environment only (no hardcoded fallbacks)
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Spotify credentials not configured' });
    }
    
    // Get access token
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
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

    // Search tracks
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const tracks = response.data.tracks.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      artists: (track.artists || []).map(a => ({
        id: a.id,
        name: a.name,
        spotify_url: a.external_urls?.spotify
      })),
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

// Search Spotify tracks (original endpoint)
router.get('/search-auth', async (req, res) => {
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
        }
      }
    );

    const tracks = response.data.tracks.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || 'Unknown Artist',
      artists: (track.artists || []).map(a => ({
        id: a.id,
        name: a.name,
        spotify_url: a.external_urls?.spotify
      })),
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
  const { track_id, artist_name, title, limit = 10 } = req.query;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    console.log('Recommendations request:', { track_id, artist_name, limit, hasToken: !!accessToken });

    if (!accessToken) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const headers = { headers: { Authorization: `Bearer ${accessToken}` } };

    // Helper to map tracks into our simplified object
    const mapTracks = (tracks) => (tracks || []).map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists?.[0]?.name || 'Unknown Artist',
      artists: (track.artists || []).map(a => ({ id: a.id, name: a.name, spotify_url: a.external_urls?.spotify })),
      album: track.album?.name || 'Unknown Album',
      image: track.album?.images?.[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls?.spotify,
      duration_ms: track.duration_ms,
      popularity: track.popularity,
      spotify_id: track.id
    }));

    // 0) If no track_id but we got title+artist, try to resolve a specific track first
    let resolvedTrackId = track_id;
    let resolvedArtistId = null;
    if (!resolvedTrackId && title && artist_name) {
      try {
        const q = `track:${title} artist:${artist_name}`;
        const searchResp = await axios.get(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1&market=US`,
          headers
        );
        resolvedTrackId = searchResp.data?.tracks?.items?.[0]?.id || null;
        resolvedArtistId = searchResp.data?.tracks?.items?.[0]?.artists?.[0]?.id || null;
      } catch (e) {
        console.warn('Track search seed failed:', e.response?.data || e.message);
      }
    }

    // 1) Prefer Spotify's official recommendations API when we have a seed track (explicit or resolved)
    if (resolvedTrackId) {
      try {
        // Fetch track to derive primary artist ID (optional but improves similarity)
        let seedArtists = resolvedArtistId ? [resolvedArtistId] : [];
        try {
          const trackResp = await axios.get(`https://api.spotify.com/v1/tracks/${encodeURIComponent(resolvedTrackId)}`, headers);
          const artistId = trackResp.data?.artists?.[0]?.id;
          if (artistId) seedArtists.push(artistId);
          // Try to capture some audio features for better tuning
          let targets = {};
          try {
            const featuresResp = await axios.get(`https://api.spotify.com/v1/audio-features/${encodeURIComponent(resolvedTrackId)}`, headers);
            const f = featuresResp.data || {};
            const round2 = (x) => (typeof x === 'number' ? Math.max(0, Math.min(1, Math.round(x * 100) / 100)) : undefined);
            if (f.danceability != null) targets.target_danceability = round2(f.danceability);
            if (f.energy != null) targets.target_energy = round2(f.energy);
            if (f.valence != null) targets.target_valence = round2(f.valence);
            // Tempo in BPM allowed directly
            if (f.tempo != null) targets.target_tempo = Math.round(f.tempo);
          } catch {}

          const params = new URLSearchParams();
          params.set('seed_tracks', resolvedTrackId);
          if (seedArtists.length > 0) params.set('seed_artists', Array.from(new Set(seedArtists)).slice(0, 2).join(','));
          params.set('limit', String(parseInt(limit)));
          params.set('market', 'US');
          Object.entries(targets).forEach(([k, v]) => { if (v != null) params.set(k, String(v)); });

          const recResp = await axios.get(`https://api.spotify.com/v1/recommendations?${params.toString()}`, headers);
          const recommendations = mapTracks(recResp.data?.tracks);
          const filtered = recommendations.filter(t => t.id !== resolvedTrackId);
          console.log('Recommendations (seeded by track):', filtered.map(r => `${r.title} by ${r.artist}`));
          return res.json({ recommendations: filtered });
        } catch (e) {
          console.error('Seeded recommendations failed, will try artist-based:', e.response?.data || e.message);
        }
      } catch (seedErr) {
        console.error('Seeded recommendations outer error:', seedErr.response?.data || seedErr.message);
      }
  }

    // 2) Fallback path: derive from artist name via search, then use recommendations API with artist and related-artist seeds
    let searchQueries = [];
    if (artist_name && artist_name.trim()) {
      try {
        const artistSearch = await axios.get(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist_name.trim())}&type=artist&limit=1&market=US`,
          headers
        );
        const artistId = artistSearch.data?.artists?.items?.[0]?.id;
        if (artistId) {
          // include a couple of related artists to improve diversity while staying similar
          let relatedIds = [];
          try {
            const relatedResp = await axios.get(`https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/related-artists`, headers);
            relatedIds = (relatedResp.data?.artists || []).slice(0, 4).map(a => a.id);
          } catch {}

          const seedArtists = Array.from(new Set([artistId, ...relatedIds])).slice(0, 3);
          const params = new URLSearchParams();
          params.set('seed_artists', seedArtists.join(','));
          params.set('limit', String(parseInt(limit)));
          params.set('market', 'US');

          const recResp = await axios.get(`https://api.spotify.com/v1/recommendations?${params.toString()}`, headers);
          const recommendations = mapTracks(recResp.data?.tracks);
          console.log('Recommendations (seeded by artist+related):', recommendations.map(r => `${r.title} by ${r.artist}`));
          return res.json({ recommendations });
        }
      } catch (e) {
        console.warn('Artist-seeded recommendations failed, will fallback to heuristic search:', e.response?.data || e.message);
      }
      // If we got here, continue to heuristic search below
    } else {
      // default broad queries
      searchQueries = [
        'year:2024 genre:pop',
        'year:2023-2024 genre:rock',
        'year:2022-2024 genre:indie'
      ];
    }

    // 3) Legacy heuristic fallback using search if seeds fail
    if (!searchQueries.length && artist_name) {
      const genres = ['pop', 'rock', 'indie', 'alternative', 'electronic', 'hip-hop', 'r&b', 'jazz', 'country'];
      const randomGenres = genres.sort(() => 0.5 - Math.random()).slice(0, 3);
      searchQueries = [
        `artist:${artist_name.trim()}`,
        `genre:${randomGenres[0]}`,
        `genre:${randomGenres[1]}`,
        `year:2020-2025`,
        `genre:${randomGenres[2]}`
      ];
    }

    const allTracks = [];
    for (const query of searchQueries.slice(0, 3)) {
      try {
        const response = await axios.get(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10&market=US`,
          headers
        );
        if (response.data.tracks.items.length > 0) {
          allTracks.push(...response.data.tracks.items);
        }
      } catch (searchError) {
        console.error(`Search failed for query "${query}":`, searchError.response?.data || searchError.message);
      }
    }

    if (allTracks.length === 0) {
      return res.status(404).json({ error: 'No recommendations found' });
    }

    const uniqueTracks = [];
    const seenIds = new Set();
    for (const track of allTracks) {
      if (!seenIds.has(track.id)) { uniqueTracks.push(track); seenIds.add(track.id); }
    }

    const selectedTracks = uniqueTracks.slice(0, parseInt(limit));
  const recommendations = mapTracks(selectedTracks);

    console.log('Recommendations (fallback):', recommendations.map(r => `${r.title} by ${r.artist}`));
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
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Search for track
    const searchResponse = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
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
      spotifyId: track.id,
  artists: (track.artists || []).map(a => ({ id: a.id, name: a.name, spotify_url: a.external_urls?.spotify })),
  albumArtists: (track.album?.artists || []).map(a => ({ id: a.id, name: a.name, spotify_url: a.external_urls?.spotify }))
    };

  } catch (error) {
    console.error('Spotify preview error:', error.message);
    return { preview: null };
  }
}

// Get audio features and popularity for a track
router.get('/audio-features', async (req, res) => {
  try {
    const { track_id } = req.query;
    if (!track_id) {
      return res.status(400).json({ error: 'track_id is required' });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(501).json({ error: 'Spotify credentials not configured' });
    }

    // Get access token via client credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResp = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = tokenResp.data.access_token;
    const headers = { headers: { Authorization: `Bearer ${accessToken}` } };

    // Fetch audio features
    const featuresResp = await axios.get(
      `https://api.spotify.com/v1/audio-features/${encodeURIComponent(track_id)}`,
      headers
    );

    // Fetch track to get popularity (0-100)
    const trackResp = await axios.get(
      `https://api.spotify.com/v1/tracks/${encodeURIComponent(track_id)}`,
      headers
    );

    const f = featuresResp.data || {};
    const popularity = trackResp.data?.popularity ?? null;

    return res.json({
      track_id,
      popularity,
      features: {
        danceability: f.danceability,
        energy: f.energy,
        valence: f.valence,
        acousticness: f.acousticness,
        instrumentalness: f.instrumentalness,
        speechiness: f.speechiness,
        tempo: f.tempo,
        liveness: f.liveness,
        key: f.key,
        mode: f.mode,
      }
    });
  } catch (error) {
    console.error('Spotify audio-features error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get audio features', details: error.response?.data || error.message });
  }
});

// Batch audio features for up to 100 track IDs
router.get('/audio-features-batch', async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'ids is required' });
    if (ids.length > 100) return res.status(400).json({ error: 'Up to 100 ids allowed' });

    // Try user access token first
    let accessToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || (req.cookies ? req.cookies.spotify_access_token : null);
    let usedUserToken = false;
    if (accessToken) {
      usedUserToken = true;
    } else {
      // Fallback to client credentials
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(501).json({ error: 'Spotify credentials not configured' });
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResp = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      accessToken = tokenResp.data.access_token;
    }
    const headers = { headers: { Authorization: `Bearer ${accessToken}` } };

    const featuresResp = await axios.get(
      `https://api.spotify.com/v1/audio-features?ids=${encodeURIComponent(ids.join(','))}`,
      headers
    );
    res.json(featuresResp.data);
  } catch (e) {
    console.error('Batch audio features error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Failed to get batch audio features' });
  }
});

// Batch artists lookup to derive genres
router.get('/artists', async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'ids is required' });
    if (ids.length > 50) return res.status(400).json({ error: 'Up to 50 ids allowed' });

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(501).json({ error: 'Spotify credentials not configured' });

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResp = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = tokenResp.data.access_token;
    const headers = { headers: { Authorization: `Bearer ${accessToken}` } };

    const artistsResp = await axios.get(
      `https://api.spotify.com/v1/artists?ids=${encodeURIComponent(ids.join(','))}`,
      headers
    );
    res.json(artistsResp.data);
  } catch (e) {
    console.error('Batch artists error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Failed to get artists' });
  }
});

async function getDeezerPreview(query) {
  try {
    const response = await axios.get(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'User-Agent': 'LyricFinder/1.0'
        }
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
        }
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

// Unofficial: Get Spotify playcount for a track via spclient (requires a valid web access token)
// Usage: GET /api/spotify/playcount?track_id=... with header Authorization: Bearer <web_access_token>
router.get('/playcount', async (req, res) => {
  try {
    const { track_id } = req.query;
    const bearer = req.headers.authorization;
    if (!track_id) {
      return res.status(400).json({ error: 'track_id is required' });
    }
    if (!bearer || !bearer.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'Authorization Bearer token (Spotify web access token) required' });
    }
    const token = bearer.replace(/^[Bb]earer\s+/, '');

    const headers = {
      headers: {
        Authorization: `Bearer ${token}`,
        'App-Platform': 'WebPlayer',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LyricFinder',
      },
      timeout: 7000,
      validateStatus: () => true,
    };

    // Try new endpoint, then legacy fallback
    const urls = [
      `https://spclient.wg.spotify.com/track-playcount/v1/track/${encodeURIComponent(track_id)}`,
      `https://spclient.wg.spotify.com/track-playcount/v1/legacy/track/${encodeURIComponent(track_id)}`,
    ];

    let data = null; let status = 0;
    for (const url of urls) {
      try {
        const resp = await axios.get(url, headers);
        status = resp.status;
        if (resp.status === 200 && resp.data) { data = resp.data; break; }
      } catch (e) {
        // try next
      }
    }

    if (!data) {
      return res.status(status || 502).json({ error: 'Failed to fetch playcount (token likely invalid for spclient)' });
    }

    // Common shapes: { tracks: { [id]: { playcount, ... } } } or { playcount, ... }
    let playcount = null;
    if (typeof data.playcount === 'number') {
      playcount = data.playcount;
    } else if (data.tracks && data.tracks[track_id] && typeof data.tracks[track_id].playcount === 'number') {
      playcount = data.tracks[track_id].playcount;
    }

    return res.json({ track_id, playcount, raw: data });
  } catch (error) {
    console.error('Spotify playcount error:', error.message);
    res.status(500).json({ error: 'Failed to get Spotify playcount' });
  }
});
