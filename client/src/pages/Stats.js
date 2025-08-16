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

  const buttonBase = 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent';
  const cardBase = 'rounded-2xl border p-6 shadow-lg transition-all duration-300 hover:shadow-xl';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header Section */}
        <section className={classNames(cardBase, 'border-indigo-500/20 bg-gray-800/50 backdrop-blur-lg mb-8')}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 animate-fade-in">
                <TrendingUp className="w-8 h-8 text-indigo-400" /> 
                Music Stats
              </h1>
              <p className="text-gray-300 text-lg">Uncover your listening habits with personalized insights and AI analysis.</p>
            </div>
            {auth.status === 'ok' ? (
              <button className={classNames(buttonBase, 'border-red-500/50 bg-red-900/20 hover:bg-red-900/30 text-red-200 focus:ring-red-500')} onClick={disconnectSpotify}>
                <LogIn className="w-4 h-4 rotate-180" /> Disconnect Spotify
              </button>
            ) : (
              <button className={classNames(buttonBase, 'border-green-500/50 bg-green-900/20 hover:bg-green-900/30 text-green-200 focus:ring-green-500')} onClick={startAuth}>
                <LogIn className="w-4 h-4" /> Connect Spotify
              </button>
            )}
          </div>

          {/* Time Range Selector */}
          {auth.status === 'ok' && (
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 animate-slide-up">
              <span className="text-gray-400 font-medium">Time Range:</span>
              <div className="flex flex-wrap gap-2">
                {TIME_RANGES.map((range) => {
                  const Icon = range.icon;
                  return (
                    <button
                      key={range.value}
                      onClick={() => setSelectedTimeRange(range.value)}
                      className={classNames(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300',
                        selectedTimeRange === range.value
                          ? 'border-indigo-400 bg-indigo-500/20 text-white shadow-md'
                          : 'border-gray-600/50 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white hover:shadow'
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
                className={classNames(buttonBase, 'md:ml-auto border-indigo-500/50 bg-indigo-900/20 hover:bg-indigo-900/30 text-indigo-200 focus:ring-indigo-500')}
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
          <div className="space-y-8">
            {/* Top Tracks */}
            <section className={classNames(cardBase, 'border-green-500/20 bg-gray-800/50 backdrop-blur-lg animate-fade-in-left')}>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Music2 className="w-6 h-6 text-green-400" /> Top Tracks
              </h2>
              {auth.status === 'ok' ? (
                <div>
                  {error && <div className="text-red-300 text-sm mb-4 p-3 bg-red-900/20 rounded-lg border border-red-500/50">{error}</div>}
                  <ul className="space-y-4 max-h-[500px] overflow-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-gray-800">
                    {topTracks.map((track, index) => (
                      <li key={track.id} className="flex items-center gap-4 rounded-xl border border-gray-600/50 bg-gray-900/50 p-4 hover:bg-gray-900/70 transition-all duration-300 hover:shadow-md transform hover:-translate-y-1">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          {track.image ? 
                            <img src={track.image} alt="cover" className="w-16 h-16 rounded-lg object-cover shadow-md"/> : 
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-600/30 to-indigo-600/30 flex items-center justify-center">
                              <Play className="w-6 h-6 text-gray-400" />
                            </div>
                          }
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium truncate text-lg">{track.title}</div>
                            <div className="text-gray-400 text-sm truncate">{track.artist}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400 font-medium">{track.popularity ?? '—'}</div>
                          <Heart className="w-5 h-5 text-red-400" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-12">Connect Spotify to view your top tracks.</div>
              )}
            </section>

            {/* Top Artists */}
            <section className={classNames(cardBase, 'border-blue-500/20 bg-gray-800/50 backdrop-blur-lg animate-fade-in-left delay-200')}>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" /> Top Artists
              </h2>
              {auth.status === 'ok' ? (
                <div>
                  <ul className="space-y-4 max-h-[500px] overflow-auto pr-2 scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-800">
                    {topArtists.map((artist, index) => (
                      <li key={artist.id} className="flex items-center gap-4 rounded-xl border border-gray-600/50 bg-gray-900/50 p-4 hover:bg-gray-900/70 transition-all duration-300 hover:shadow-md transform hover:-translate-y-1">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          {artist.image ? 
                            <img src={artist.image} alt="artist" className="w-16 h-16 rounded-full object-cover shadow-md"/> : 
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center">
                              <Mic className="w-6 h-6 text-gray-400" />
                            </div>
                          }
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium truncate text-lg">{artist.name}</div>
                            <div className="text-gray-400 text-sm truncate">
                              {artist.genres.slice(0, 2).join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400 font-medium">{artist.popularity ?? '—'}</div>
                          <Heart className="w-5 h-5 text-red-400" />
                        </div>
                      </li>
                    ))}
                  </ul>
                  {/* Top Genres Section */}
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-400" /> Top Genres
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const genreCounts = {};
                        topArtists.forEach(a => {
                          (a.genres || []).forEach(g => {
                            genreCounts[g] = (genreCounts[g] || 0) + 1;
                          });
                        });
                        return Object.entries(genreCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 8)
                          .map(([genre, count]) => (
                            <span key={genre} className="text-sm font-medium text-purple-200 border border-purple-500/50 bg-purple-900/20 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm transition-all duration-300 hover:bg-purple-900/30">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400"></div>
                              {genre}
                              <span className="text-purple-300">({count})</span>
                            </span>
                          ));
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-12">Connect Spotify to view your top artists.</div>
              )}
            </section>
          </div>

          {/* Right Side - Judge/Analysis */}
          <div className="space-y-8">
            <section className={classNames(cardBase, 'border-yellow-500/20 bg-gray-800/50 backdrop-blur-lg animate-fade-in-right')}>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Stars className="w-6 h-6 text-yellow-400" /> AI Music Judge
              </h2>
              {!analysis ? (
                <div className="text-center py-12 space-y-6">
                  <p className="text-gray-400 text-base">Load your stats to unlock AI-powered insights into your music taste.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      disabled={loading || topTracks.length === 0 || topArtists.length === 0} 
                      onClick={fetchAnalysis}
                      className={classNames(buttonBase, 'border-yellow-500/50 bg-yellow-900/20 hover:bg-yellow-900/30 text-yellow-200 focus:ring-yellow-500')}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                      {loading ? 'Analyzing...' : 'Analyze My Taste'}
                    </button>
                    <button
                      disabled={loading || topTracks.length === 0 || topArtists.length === 0}
                      onClick={async () => {
                        try {
                          setLoading(true);
                          setError('');
                          // Prepare data for backend
                          const accessToken = window.localStorage.getItem('spotify_token');
                          const response = await fetch('/api/critic', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ accessToken })
                          });
                          if (!response.ok) throw new Error('Failed to get AI critique');
                          const data = await response.json();
                          setAnalysis({
                            ...data.analysis,
                            aiCritique: data.critique
                          });
                        } catch (e) {
                          setError(e.message || 'AI Critic failed. Try again.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className={classNames(buttonBase, 'border-orange-500/50 bg-orange-900/20 hover:bg-orange-900/30 text-orange-200 focus:ring-orange-500')}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Stars className="w-4 h-4"/>}
                      {loading ? 'Roasting...' : 'AI Music Critic Roast'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Vibe Summary */}
                  <div className="rounded-xl border border-indigo-500/50 bg-indigo-900/20 p-6 shadow-md transition-all duration-300 hover:shadow-lg">
                    <div className="text-gray-300 text-sm mb-2 font-medium uppercase tracking-wide">Your Vibe</div>
                    <div className="text-white text-2xl font-bold mb-3">{analysis.roastLevel ? `${analysis.roastLevel} & ${analysis.energyLevel}` : ''}</div>
                    <p className="text-gray-200 leading-relaxed">{analysis.verdict || ''}</p>
                  </div>

                  {/* Audio Features Grid */}
                  {analysis.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(analysis.summary).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-gray-600/50 bg-gray-900/50 p-4 shadow-sm transition-all duration-300 hover:shadow-md">
                          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">{key}</div>
                          <div className="text-white font-semibold text-xl mb-2">
                            {key === 'tempo' ? `${Math.round(value||0)} BPM` : `${Math.round(((value||0)*100))}%`}
                          </div>
                          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out" 
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
                  )}

                  {/* Top Genres */}
                  {analysis.topGenres && (
                    <div className="rounded-xl border border-purple-500/50 bg-purple-900/20 p-6 shadow-md transition-all duration-300 hover:shadow-lg">
                      <div className="text-gray-300 text-sm mb-4 font-medium uppercase tracking-wide">Top Genres</div>
                      <div className="flex flex-wrap gap-3">
                        {analysis.topGenres.map((g) => (
                          <span 
                            key={g.genre} 
                            className="text-sm font-medium text-purple-200 border border-purple-500/50 bg-purple-900/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm transition-all duration-300 hover:bg-purple-900/50"
                          >
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400"></div>
                            {g.genre} <span className="text-purple-300">({g.count})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Critique/roast */}
                  {analysis.aiCritique && (
                    <div className="rounded-xl border border-yellow-500/50 bg-yellow-900/20 p-6 mt-6 shadow-md transition-all duration-300 hover:shadow-lg">
                      <div className="text-yellow-300 text-xl font-bold mb-3 flex items-center gap-2">
                        <Stars className="w-6 h-6"/> AI Critic's Verdict
                      </div>
                      <pre className="text-yellow-100 whitespace-pre-wrap text-base leading-relaxed font-sans">{analysis.aiCritique}</pre>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}