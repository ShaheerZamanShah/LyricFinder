import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { API_ENDPOINTS } from '../config/api';
import { 
  LogIn, 
  Loader2, 
  Music2, 
  Sparkles, 
  Stars, 
  Users, 
  TrendingUp, 
  Calendar,
  Play,
  Mic,
  Heart,
  Zap
} from 'lucide-react';

function classNames(...xs) { return xs.filter(Boolean).join(' '); }

const TIME_RANGES = [
  { value: 'short_term', label: '1 Month', icon: Calendar },
  { value: 'medium_term', label: '6 Months', icon: TrendingUp },
  { value: 'long_term', label: '1 Year', icon: Sparkles }
];

export default function Stats() {
  const { theme } = useTheme();
  const [auth, setAuth] = useState({ status: 'unknown', profile: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('medium_term');
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [analysis, setAnalysis] = useState(null);

  const startAuth = useCallback(() => {
  window.location.href = API_ENDPOINTS.SPOTIFY_AUTH;
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setError('');
      const token = window.localStorage.getItem('spotify_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      
  console.log('Fetching profile from:', API_ENDPOINTS.SPOTIFY_ME);
      const r = await fetch(API_ENDPOINTS.SPOTIFY_ME, { 
        credentials: 'include', 
        headers,
        mode: 'cors'
      });
      
      console.log('Profile response status:', r.status);
      if (!r.ok) {
        const errorText = await r.text();
        console.error('Profile error response:', errorText);
        return setAuth({ status: r.status === 401 ? 'unauth' : 'error', profile: null });
      }
      
      const data = await r.json();
      console.log('Profile data received:', data);
      setAuth({ status: 'ok', profile: data });
    } catch (e) {
      console.error('Profile fetch error:', e);
      setAuth({ status: 'error', profile: null });
    }
  }, []);

  const fetchTopTracks = useCallback(async () => {
    try {
      setLoading(true); 
      setError(''); 
      setTopTracks([]); 
      setAnalysis(null);
      
  console.log('Fetching top tracks from:', API_ENDPOINTS.SPOTIFY_ME_TOP_TRACKS);
      const r = await fetch(`${API_ENDPOINTS.SPOTIFY_ME_TOP_TRACKS}?time_range=${selectedTimeRange}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      console.log('Top tracks response status:', r.status);
      if (r.status === 401) {
        console.log('Unauthorized, redirecting to auth');
  window.location.href = API_ENDPOINTS.SPOTIFY_AUTH;
        return;
      }
      
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        console.error('Top tracks error response:', errorData);
        throw new Error(errorData.error || `HTTP ${r.status}: Failed to fetch top tracks`);
      }
      
      const data = await r.json();
      console.log('Top tracks data received:', data);
      const items = (data.items || []).map(t => ({
        id: t.id,
        title: t.name,
        artist: t.artists?.[0]?.name || 'Unknown',
        artists: (t.artists||[]).map(a => ({ id:a.id, name:a.name })),
        image: t.album?.images?.[0]?.url || null,
        popularity: t.popularity,
        duration_ms: t.duration_ms,
        spotify_url: t.external_urls?.spotify,
      }));
      setTopTracks(items);
    } catch (e) {
      console.error('Top tracks fetch error:', e);
      setError(e.message || 'Could not load your top tracks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);

  const fetchTopArtists = useCallback(async () => {
    try {
      setLoading(true); 
      setError(''); 
      setTopArtists([]); 
      
  console.log('Fetching top artists from:', API_ENDPOINTS.SPOTIFY_ME_TOP_ARTISTS);
      const r = await fetch(`${API_ENDPOINTS.SPOTIFY_ME_TOP_ARTISTS}?time_range=${selectedTimeRange}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      console.log('Top artists response status:', r.status);
      if (r.status === 401) {
        console.log('Unauthorized, redirecting to auth');
  window.location.href = API_ENDPOINTS.SPOTIFY_AUTH;
        return;
      }
      
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        console.error('Top artists error response:', errorData);
        throw new Error(errorData.error || `HTTP ${r.status}: Failed to fetch top artists`);
      }
      
      const data = await r.json();
      console.log('Top artists data received:', data);
      const items = (data.items || []).map(a => ({
        id: a.id,
        name: a.name,
        image: a.images?.[0]?.url || null,
        popularity: a.popularity,
        genres: a.genres || [],
        spotify_url: a.external_urls?.spotify,
        followers: a.followers?.total || 0,
      }));
      setTopArtists(items);
    } catch (e) {
      console.error('Top artists fetch error:', e);
      setError(e.message || 'Could not load your top artists. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true); 
      setError('');
      const ids = topTracks.map(t => t.id).slice(0, 20);
      if (ids.length === 0) throw new Error('No tracks to analyze');
      
      // Use recommended batch analysis logic
      const featuresResp = await fetch(`${API_ENDPOINTS.SPOTIFY_AUDIO_FEATURES_BATCH}?ids=${ids.join(',')}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!featuresResp.ok) throw new Error(`Audio features error: ${featuresResp.status}`);
      const featuresData = await featuresResp.json();
      const features = featuresData.audio_features || featuresData.features || [];
      
      const artistIds = Array.from(new Set(topTracks.flatMap(t => t.artists?.map(a=>a.id).filter(Boolean) || []))).slice(0, 40);
      const artistsResp = await fetch(`${API_ENDPOINTS.SPOTIFY_ARTISTS}?ids=${encodeURIComponent(artistIds.join(','))}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!artistsResp.ok) throw new Error(`Artists error: ${artistsResp.status}`);
      const artistsData = (await artistsResp.json())?.artists || [];

      const genres = {};
      for (const a of artistsData) {
        for (const g of (a.genres || [])) genres[g] = (genres[g]||0)+1;
      }
      const topGenres = Object.entries(genres).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([g,c])=>({genre:g,count:c}));

      const numeric = (k) => features.map(f => typeof f?.[k] === 'number' ? f[k] : null).filter(v => v != null);
      const avg = (xs) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null;
      const summary = {
        danceability: avg(numeric('danceability')),
        energy: avg(numeric('energy')),
        valence: avg(numeric('valence')),
        acousticness: avg(numeric('acousticness')),
        instrumentalness: avg(numeric('instrumentalness')),
        speechiness: avg(numeric('speechiness')),
        tempo: avg(numeric('tempo')),
      };

      // Enhanced AI verdict with more personality
      const roastLevel = (summary.valence ?? 0.5) < 0.35 ? 'Brooding' : (summary.valence ?? 0.5) > 0.7 ? 'Sunny' : 'Balanced';
      const energyLevel = (summary.energy ?? 0.5) > 0.7 ? 'High-Energy' : (summary.energy ?? 0.5) < 0.3 ? 'Chill' : 'Moderate';
      const verdict = `Your vibe is ${roastLevel.toLowerCase()} with ${energyLevel.toLowerCase()} energy. Danceability ${Math.round((summary.danceability||0)*100)}%, energy ${Math.round((summary.energy||0)*100)}%, and a tempo around ${Math.round(summary.tempo||0)} BPM. Top genres: ${topGenres.map(g=>g.genre).join(', ') || '—'}.`;

      setAnalysis({ summary, topGenres, verdict, roastLevel, energyLevel });
    } catch (e) {
      console.error('Analysis error:', e);
      setError(e.message || 'Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [topTracks]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const buttonBase = 'inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white px-4 py-2 transition-all duration-200 hover:scale-105';
  const cardBase = 'rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]';

  const disconnectSpotify = useCallback(() => {
    window.localStorage.removeItem('spotify_token');
    document.cookie = 'spotify_access_token=; Max-Age=0; path=/;';
    document.cookie = 'spotify_refresh_token=; Max-Age=0; path=/;';
    setAuth({ status: 'unauth', profile: null });
    setTopTracks([]);
    setTopArtists([]);
    setAnalysis(null);
    setError('');
  }, []);

  const loadStats = useCallback(async () => {
    await Promise.all([fetchTopTracks(), fetchTopArtists()]);
  }, [fetchTopTracks, fetchTopArtists]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <section className={classNames('rounded-2xl border border-white/15 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-md p-6 md:p-8 shadow-xl mb-8')}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-400" /> 
              Music Stats
            </h1>
            <p className="text-white/80 text-lg">Discover your listening patterns and get AI-powered insights about your music taste.</p>
          </div>
          {auth.status === 'ok' ? (
            <button className={buttonBase} onClick={disconnectSpotify}>
              <LogIn className="w-4 h-4 rotate-180" /> Disconnect Spotify
            </button>
          ) : (
            <button className={buttonBase} onClick={startAuth}>
              <LogIn className="w-4 h-4" /> Connect Spotify
            </button>
          )}
        </div>

        {/* Time Range Selector */}
        {auth.status === 'ok' && (
          <div className="flex items-center gap-4">
            <span className="text-white/70 font-medium">Time Range:</span>
            <div className="flex gap-2">
              {TIME_RANGES.map((range) => {
                const Icon = range.icon;
                return (
                  <button
                    key={range.value}
                    onClick={() => setSelectedTimeRange(range.value)}
                    className={classNames(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200',
                      selectedTimeRange === range.value
                        ? 'border-purple-400 bg-purple-500/20 text-white'
                        : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {range.label}
                  </button>
                );
              })}
            </div>
            <button 
              disabled={loading} 
              onClick={loadStats}
              className={classNames(buttonBase, 'ml-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30')}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>}
              {loading ? 'Loading...' : 'Load Stats'}
            </button>
          </div>
        )}
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Side - Stats */}
        <div className="space-y-6">
          {/* Top Tracks */}
          <section className={cardBase}>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Music2 className="w-5 h-5 text-green-400"/> Top Tracks
            </h2>
            {auth.status === 'ok' ? (
              <div>
                {error && <div className="text-red-300 text-sm mb-3 p-2 bg-red-500/10 rounded">{error}</div>}
                <ul className="space-y-3 max-h-96 overflow-auto pr-2">
                  {topTracks.map((track, index) => (
                    <li key={track.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        {track.image ? 
                          <img src={track.image} alt="cover" className="w-12 h-12 rounded object-cover"/> : 
                          <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white/50" />
                          </div>
                        }
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium truncate">{track.title}</div>
                          <div className="text-white/70 text-sm truncate">{track.artist}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-white/70 text-sm">{track.popularity ?? '—'}</div>
                        <Heart className="w-4 h-4 text-red-400" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-white/70 text-center py-8">Connect Spotify to see your top tracks.</div>
            )}
          </section>

          {/* Top Artists */}
          <section className={cardBase}>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400"/> Top Artists
            </h2>
            {auth.status === 'ok' ? (
              <div>
                <ul className="space-y-3 max-h-96 overflow-auto pr-2">
                  {topArtists.map((artist, index) => (
                    <li key={artist.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-all duration-200 hover:scale-[1.02]">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        {artist.image ? 
                          <img src={artist.image} alt="artist" className="w-12 h-12 rounded-full object-cover"/> : 
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <Mic className="w-5 h-5 text-white/50" />
                          </div>
                        }
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium truncate">{artist.name}</div>
                          <div className="text-white/70 text-sm truncate">
                            {artist.genres.slice(0, 2).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-white/70 text-sm">{artist.popularity ?? '—'}</div>
                        <Heart className="w-4 h-4 text-red-400" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-white/70 text-center py-8">Connect Spotify to see your top artists.</div>
            )}
          </section>
        </div>

        {/* Right Side - Judge/Analysis */}
        <div className="space-y-6">
          <section className={cardBase}>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Stars className="w-5 h-5 text-yellow-400"/> AI Music Judge
            </h2>
            {!analysis ? (
              <div className="text-center py-8">
                <p className="text-white/70 text-sm mb-4">Load your stats first, then get AI-powered insights about your music taste.</p>
                <button 
                  disabled={loading || topTracks.length === 0} 
                  onClick={fetchAnalysis}
                  className={classNames(buttonBase, 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/30')}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                  {loading ? 'Analyzing...' : 'Analyze My Taste'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Vibe Summary */}
                <div className="rounded-lg border border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-4">
                  <div className="text-white/80 text-sm mb-2">Your Vibe</div>
                  <div className="text-white text-xl font-bold mb-2">{analysis.roastLevel} & {analysis.energyLevel}</div>
                  <p className="text-white/90 leading-relaxed">{analysis.verdict}</p>
                </div>

                {/* Audio Features Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(analysis.summary).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="text-white/70 text-xs uppercase tracking-wide mb-1">{key}</div>
                      <div className="text-white font-semibold text-lg">
                        {key === 'tempo' ? `${Math.round(value||0)} BPM` : `${Math.round(((value||0)*100))}%`}
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-700" 
                          style={{ 
                            width: key === 'tempo' 
                              ? `${Math.min(100, Math.round(((value||0)-60)/1.4))}%` 
                              : `${Math.round(((value||0)*100))}%` 
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Genres */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-white/80 text-sm mb-3">Top Genres</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topGenres.map((genre, index) => (
                      <span 
                        key={genre.genre} 
                        className="text-sm text-white/90 border border-white/15 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full px-3 py-1.5 flex items-center gap-1"
                      >
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"></div>
                        {genre.genre}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
