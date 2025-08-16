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
  Zap,
  LogOut,
  Disc,
  Headphones,
  Activity,
  BarChart2,
  Music,
  Volume2
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
  const [activeTab, setActiveTab] = useState('tracks'); // For responsive tabs

  const startAuth = useCallback(() => {
    window.location.href = API_ENDPOINTS.SPOTIFY_AUTH;
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setError('');
      const token = window.localStorage.getItem('spotify_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      
      const r = await fetch(API_ENDPOINTS.SPOTIFY_ME, { 
        credentials: 'include', 
        headers,
        mode: 'cors'
      });
      
      if (!r.ok) {
        const errorText = await r.text();
        return setAuth({ status: r.status === 401 ? 'unauth' : 'error', profile: null });
      }
      
      const data = await r.json();
      setAuth({ status: 'ok', profile: data });
    } catch (e) {
      setAuth({ status: 'error', profile: null });
    }
  }, []);

  const fetchTopTracks = useCallback(async () => {
    try {
      setLoading(true); 
      setError(''); 
      setTopTracks([]); 
      setAnalysis(null);
      
      const r = await fetch(`${API_ENDPOINTS.SPOTIFY_ME_TOP_TRACKS}?time_range=${selectedTimeRange}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (r.status === 401) {
        window.location.href = API_ENDPOINTS.SPOTIFY_AUTH;
        return;
      }
      
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${r.status}: Failed to fetch top tracks`);
      }
      
      const data = await r.json();
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
      
      const r = await fetch(`${API_ENDPOINTS.SPOTIFY_ME_TOP_ARTISTS}?time_range=${selectedTimeRange}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (r.status === 401) {
        window.location.href = API_ENDPOINTS.SPOTIFY_AUTH;
        return;
      }
      
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${r.status}: Failed to fetch top artists`);
      }
      
      const data = await r.json();
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
      
      const featuresResp = await fetch(`${API_ENDPOINTS.SPOTIFY_AUDIO_FEATURES_BATCH}?ids=${ids.join(',')}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!featuresResp.ok) throw new Error(`Audio features error: ${featuresResp.status}`);
      const featuresData = await featuresResp.json();
      const features = featuresData.audio_features || featuresData.features || [];
      
      const artistIds = Array.from(new Set(topTracks.flatMap(t => t.artists?.map(a=>a.id).filter(Boolean) || [])).slice(0, 40);
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

      const roastLevel = (summary.valence ?? 0.5) < 0.35 ? 'Brooding' : (summary.valence ?? 0.5) > 0.7 ? 'Sunny' : 'Balanced';
      const energyLevel = (summary.energy ?? 0.5) > 0.7 ? 'High-Energy' : (summary.energy ?? 0.5) < 0.3 ? 'Chill' : 'Moderate';
      const verdict = `Your vibe is ${roastLevel.toLowerCase()} with ${energyLevel.toLowerCase()} energy. Danceability ${Math.round((summary.danceability||0)*100)}%, energy ${Math.round((summary.energy||0)*100)}%, and a tempo around ${Math.round(summary.tempo||0)} BPM. Top genres: ${topGenres.map(g=>g.genre).join(', ') || '—'}.`;

      setAnalysis({ summary, topGenres, verdict, roastLevel, energyLevel });
    } catch (e) {
      setError(e.message || 'Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [topTracks]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const buttonBase = 'inline-flex items-center gap-2 rounded-lg border border-white/15 bg-gradient-to-r from-purple-600/90 to-blue-500/90 hover:from-purple-600 hover:to-blue-500 text-white px-4 py-2 transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-purple-500/20';
  const cardBase = 'rounded-xl border border-white/10 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-xl hover:border-white/20';

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

  // Format duration from ms to mm:ss
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-900/20 backdrop-blur-lg p-6 md:p-8 shadow-2xl mb-8 animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" /> 
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">
                  Music Stats Dashboard
                </span>
              </h1>
              <p className="text-white/80 text-lg max-w-2xl">
                Discover your listening patterns and get AI-powered insights about your music taste
              </p>
            </div>
            
            {auth.status === 'ok' ? (
              <button className={buttonBase} onClick={disconnectSpotify}>
                <LogOut className="w-4 h-4" /> Disconnect Spotify
              </button>
            ) : (
              <button className={buttonBase} onClick={startAuth}>
                <LogIn className="w-4 h-4" /> Connect Spotify
              </button>
            )}
          </div>

          {/* Time Range Selector */}
          {auth.status === 'ok' && (
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-white/70 font-medium">Time Range:</span>
              <div className="flex flex-wrap gap-2">
                {TIME_RANGES.map((range) => {
                  const Icon = range.icon;
                  return (
                    <button
                      key={range.value}
                      onClick={() => setSelectedTimeRange(range.value)}
                      className={classNames(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 shadow-md',
                        selectedTimeRange === range.value
                          ? 'border-purple-400 bg-gradient-to-r from-purple-600/30 to-blue-500/30 text-white shadow-purple-500/30'
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
                className={classNames(
                  buttonBase, 
                  'bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg',
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin"/>
                ) : (
                  <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400"/>
                )}
                {loading ? 'Loading...' : 'Load Stats'}
              </button>
            </div>
          )}
        </section>

        {/* Stats Tabs for Mobile */}
        <div className="flex md:hidden mb-6 border-b border-white/10">
          <button 
            className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'tracks' ? 'text-white border-b-2 border-purple-400' : 'text-white/60'}`}
            onClick={() => setActiveTab('tracks')}
          >
            Tracks
          </button>
          <button 
            className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'artists' ? 'text-white border-b-2 border-blue-400' : 'text-white/60'}`}
            onClick={() => setActiveTab('artists')}
          >
            Artists
          </button>
          <button 
            className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'analysis' ? 'text-white border-b-2 border-yellow-400' : 'text-white/60'}`}
            onClick={() => setActiveTab('analysis')}
          >
            Analysis
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Side - Top Tracks */}
          <div className={`lg:col-span-1 ${activeTab === 'tracks' ? 'block' : 'hidden md:block'}`}>
            <section className={classNames(cardBase, 'h-full animate-slideIn')}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-1.5 rounded-lg">
                  <Music2 className="w-5 h-5 text-white"/> 
                </div>
                Top Tracks
              </h2>
              {auth.status === 'ok' ? (
                <div>
                  {error && <div className="text-red-300 text-sm mb-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">{error}</div>}
                  <ul className="space-y-3 max-h-[500px] overflow-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                    {topTracks.map((track, index) => (
                      <li 
                        key={track.id} 
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-gradient-to-r from-gray-800/50 to-gray-800/30 p-3 hover:bg-white/10 transition-all duration-200 hover:scale-[1.01] group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          {track.image ? 
                            <img 
                              src={track.image} 
                              alt="cover" 
                              className="w-12 h-12 rounded object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                            /> : 
                            <div className="w-12 h-12 rounded bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white/50" />
                            </div>
                          }
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium truncate">{track.title}</div>
                            <div className="text-white/70 text-sm truncate">{track.artist}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {formatDuration(track.duration_ms)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-white/70 text-sm">{track.popularity ?? '—'}</div>
                          <div className="bg-red-500/20 p-1.5 rounded-full">
                            <Heart className="w-4 h-4 text-red-400" fill="currentColor" fillOpacity={0.3} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-white/70 text-center py-8 flex flex-col items-center">
                  <Disc className="w-10 h-10 text-white/30 mb-3" />
                  Connect Spotify to see your top tracks
                </div>
              )}
            </section>
          </div>

          {/* Middle - Top Artists */}
          <div className={`lg:col-span-1 ${activeTab === 'artists' ? 'block' : 'hidden md:block'}`}>
            <section className={classNames(cardBase, 'h-full animate-slideIn delay-100')}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-1.5 rounded-lg">
                  <Users className="w-5 h-5 text-white"/> 
                </div>
                Top Artists
              </h2>
              {auth.status === 'ok' ? (
                <div>
                  <ul className="space-y-3 max-h-[500px] overflow-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                    {topArtists.map((artist, index) => (
                      <li 
                        key={artist.id} 
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-gradient-to-r from-gray-800/50 to-gray-800/30 p-3 hover:bg-white/10 transition-all duration-200 hover:scale-[1.01] group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          {artist.image ? 
                            <img 
                              src={artist.image} 
                              alt="artist" 
                              className="w-12 h-12 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform duration-300"
                            /> : 
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                              <Mic className="w-5 h-5 text-white/50" />
                            </div>
                          }
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-medium truncate">{artist.name}</div>
                            <div className="text-white/70 text-sm truncate">
                              {artist.genres.slice(0, 2).join(', ')}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {artist.followers.toLocaleString()} followers
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-white/70 text-sm">{artist.popularity ?? '—'}</div>
                          <div className="bg-red-500/20 p-1.5 rounded-full">
                            <Heart className="w-4 h-4 text-red-400" fill="currentColor" fillOpacity={0.3} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Top Genres Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1 rounded-lg">
                        <Sparkles className="w-4 h-4 text-white"/> 
                      </div>
                      Top Genres
                    </h3>
                    <div className="flex flex-wrap gap-2">
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
                            <span 
                              key={genre} 
                              className="text-sm text-white/90 border border-white/15 bg-gradient-to-r from-purple-600/20 to-pink-500/20 rounded-full px-3 py-1.5 flex items-center gap-1 hover:scale-105 transition-transform duration-200"
                            >
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400"></div>
                              {genre}
                              <span className="ml-1 text-white/60">({count})</span>
                            </span>
                          ));
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-white/70 text-center py-8 flex flex-col items-center">
                  <Headphones className="w-10 h-10 text-white/30 mb-3" />
                  Connect Spotify to see your top artists
                </div>
              )}
            </section>
          </div>

          {/* Right Side - Analysis */}
          <div className={`lg:col-span-1 ${activeTab === 'analysis' ? 'block' : 'hidden md:block'}`}>
            <section className={classNames(cardBase, 'h-full animate-slideIn delay-200')}>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-1.5 rounded-lg">
                  <Activity className="w-5 h-5 text-white"/> 
                </div>
                AI Music Analysis
              </h2>
              
              {!analysis ? (
                <div className="text-center py-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 flex items-center justify-center animate-pulse">
                      <BarChart2 className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mb-6 max-w-md mx-auto">
                    Load your stats first, then get AI-powered insights about your music taste
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      disabled={loading || topTracks.length === 0 || topArtists.length === 0} 
                      onClick={fetchAnalysis}
                      className={classNames(
                        buttonBase, 
                        'bg-gradient-to-r from-yellow-600/90 to-amber-500/90 hover:from-yellow-600 hover:to-amber-500',
                        (loading || topTracks.length === 0 || topArtists.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                      )}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                      {loading ? 'Analyzing...' : 'Analyze My Taste'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Vibe Summary */}
                  <div className="rounded-lg border border-white/10 bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-1 rounded">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-white/80 text-sm">Your Music Vibe</div>
                    </div>
                    <div className="text-white text-xl font-bold mb-2">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">
                        {analysis.roastLevel} & {analysis.energyLevel}
                      </span>
                    </div>
                    <p className="text-white/90 leading-relaxed">{analysis.verdict || ''}</p>
                  </div>

                  {/* Audio Features Grid */}
                  {analysis.summary && (
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(analysis.summary).map(([key, value]) => (
                        <div 
                          key={key} 
                          className="rounded-lg border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-3 hover:bg-white/5 transition-all duration-300"
                        >
                          <div className="text-white/70 text-xs uppercase tracking-wide mb-1 flex items-center gap-1">
                            <Volume2 className="w-3 h-3" /> {key}
                          </div>
                          <div className="text-white font-semibold text-lg">
                            {key === 'tempo' ? `${Math.round(value||0)} BPM` : `${Math.round(((value||0)*100))}%`}
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded mt-2 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700 ease-out" 
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
                  {analysis.topGenres && analysis.topGenres.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-4">
                      <div className="text-white/80 text-sm mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" /> Top Genres
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.topGenres.map((genre, index) => (
                          <span 
                            key={genre.genre} 
                            className="text-sm text-white/90 border border-white/15 bg-gradient-to-r from-purple-600/20 to-blue-500/20 rounded-full px-3 py-1.5 flex items-center gap-1 hover:scale-105 transition-transform duration-200"
                          >
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"></div>
                            {genre.genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analysis Actions */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <button 
                      onClick={fetchAnalysis}
                      className={classNames(buttonBase, 'bg-gradient-to-r from-purple-600/90 to-blue-500/90')}
                    >
                      <Sparkles className="w-4 h-4" /> Re-analyze
                    </button>
                    <button
                      onClick={disconnectSpotify}
                      className={classNames(buttonBase, 'bg-gradient-to-r from-gray-700 to-gray-600')}
                    >
                      <LogOut className="w-4 h-4" /> Disconnect
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      
      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-slideIn {
          animation: slideIn 0.5s ease-out forwards;
        }
        .animate-slideIn.delay-100 {
          animation-delay: 0.1s;
        }
        .animate-slideIn.delay-200 {
          animation-delay: 0.2s;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.2);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}