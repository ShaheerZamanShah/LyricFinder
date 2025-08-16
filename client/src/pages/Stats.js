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
  BarChart3,
  Headphones,
  Award
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

  const buttonBase = 'group relative overflow-hidden px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl';
  const cardBase = 'relative overflow-hidden backdrop-blur-xl rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50 shadow-2xl transition-all duration-500 hover:shadow-emerald-500/10 hover:border-emerald-400/20';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-40 left-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-emerald-400/20 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Hero Header */}
        <section className={classNames(cardBase, 'p-8 md:p-12 mb-12 group')}>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/20">
                  <BarChart3 className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent mb-2">
                    Spotify Analytics
                  </h1>
                  <p className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-2xl">
                    Dive deep into your musical universe. Discover patterns, explore your taste, and get AI-powered insights about your listening habits.
                  </p>
                </div>
              </div>

              {auth.status === 'ok' && auth.profile && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-400/20">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Headphones className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-emerald-300 font-semibold">Welcome back, {auth.profile.display_name}</p>
                    <p className="text-slate-400 text-sm">{auth.profile.followers?.total || 0} followers</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {auth.status === 'ok' ? (
                <button 
                  className={classNames(buttonBase, 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600')}
                  onClick={disconnectSpotify}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <LogIn className="w-5 h-5 rotate-180 relative z-10" /> 
                  <span className="relative z-10">Disconnect</span>
                </button>
              ) : (
                <button 
                  className={classNames(buttonBase, 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500')}
                  onClick={startAuth}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <LogIn className="w-5 h-5 relative z-10" /> 
                  <span className="relative z-10">Connect Spotify</span>
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Time Range Selector */}
          {auth.status === 'ok' && (
            <div className="relative z-10 mt-8 pt-8 border-t border-white/10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <span className="text-slate-300 font-semibold">Time Period:</span>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {TIME_RANGES.map((range) => {
                    const Icon = range.icon;
                    const isSelected = selectedTimeRange === range.value;
                    return (
                      <button
                        key={range.value}
                        onClick={() => setSelectedTimeRange(range.value)}
                        className={classNames(
                          'group relative flex items-center gap-3 px-6 py-3 rounded-xl border transition-all duration-300 transform hover:scale-105',
                          isSelected
                            ? 'border-emerald-400/50 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-white shadow-lg shadow-emerald-500/20'
                            : 'border-white/20 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/30'
                        )}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl"></div>
                        )}
                        <Icon className="w-4 h-4 relative z-10" />
                        <span className="font-medium relative z-10">{range.label}</span>
                        {isSelected && (
                          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-xl blur opacity-50"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  disabled={loading} 
                  onClick={loadStats}
                  className={classNames(
                    buttonBase, 
                    'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin relative z-10"/>
                  ) : (
                    <Zap className="w-5 h-5 relative z-10"/>
                  )}
                  <span className="relative z-10">{loading ? 'Loading...' : 'Load Stats'}</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Main Dashboard Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Top Tracks - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-8">
            <section className={classNames(cardBase, 'p-8 group')}>
              <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-400/20">
                    <Music2 className="w-6 h-6 text-green-400"/>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Top Tracks</h2>
                    <p className="text-slate-400">Your most played songs</p>
                  </div>
                </div>
                {topTracks.length > 0 && (
                  <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30">
                    <span className="text-green-300 font-semibold">{topTracks.length} tracks</span>
                  </div>
                )}
              </div>

              {auth.status === 'ok' ? (
                <div className="relative z-10">
                  {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-400/30 text-red-300">
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                        {error}
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-emerald-500/30">
                    {topTracks.map((track, index) => (
                      <div key={track.id} 
                        className="group relative flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-gradient-to-r from-slate-800/30 to-slate-900/30 hover:from-slate-700/40 hover:to-slate-800/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/10"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                        
                        <div className="relative z-10 flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold shadow-lg">
                            {index + 1}
                          </div>
                          
                          {track.image ? (
                            <div className="relative">
                              <img 
                                src={track.image} 
                                alt="cover" 
                                className="w-14 h-14 rounded-xl object-cover shadow-lg border border-white/10"
                              />
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 rounded-xl"></div>
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border border-white/10">
                              <Play className="w-6 h-6 text-slate-300" />
                            </div>
                          )}
                          
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-semibold text-lg truncate group-hover:text-emerald-300 transition-colors">
                              {track.title}
                            </h3>
                            <p className="text-slate-400 truncate">{track.artist}</p>
                            {track.duration_ms && (
                              <p className="text-slate-500 text-sm">
                                {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative z-10 flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50">
                            <Heart className="w-4 h-4 text-red-400" />
                            <span className="text-slate-300 text-sm font-medium">{track.popularity ?? '—'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative z-10 text-center py-16">
                  <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mb-6">
                    <Music2 className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-400 text-lg">Connect your Spotify account to discover your top tracks</p>
                </div>
              )}
            </section>

            {/* Top Artists */}
            <section className={classNames(cardBase, 'p-8 group')}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/20">
                    <Users className="w-6 h-6 text-blue-400"/>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Top Artists</h2>
                    <p className="text-slate-400">Your favorite musicians</p>
                  </div>
                </div>
                {topArtists.length > 0 && (
                  <div className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30">
                    <span className="text-blue-300 font-semibold">{topArtists.length} artists</span>
                  </div>
                )}
              </div>

              {auth.status === 'ok' ? (
                <div className="relative z-10">
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-blue-500/30">
                    {topArtists.map((artist, index) => (
                      <div key={artist.id} 
                        className="group relative flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-gradient-to-r from-slate-800/30 to-slate-900/30 hover:from-slate-700/40 hover:to-slate-800/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                        
                        <div className="relative z-10 flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold shadow-lg">
                            {index + 1}
                          </div>
                          
                          {artist.image ? (
                            <div className="relative">
                              <img 
                                src={artist.image} 
                                alt="artist" 
                                className="w-14 h-14 rounded-full object-cover shadow-lg border-2 border-white/10"
                              />
                              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 rounded-full"></div>
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center border-2 border-white/10">
                              <Mic className="w-6 h-6 text-slate-300" />
                            </div>
                          )}
                          
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-semibold text-lg truncate group-hover:text-blue-300 transition-colors">
                              {artist.name}
                            </h3>
                            <p className="text-slate-400 truncate">
                              {artist.genres.slice(0, 2).join(', ') || 'Various genres'}
                            </p>
                            {artist.followers > 0 && (
                              <p className="text-slate-500 text-sm">
                                {artist.followers.toLocaleString()} followers
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative z-10 flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50">
                          <Heart className="w-4 h-4 text-red-400" />
                          <span className="text-slate-300 text-sm font-medium">{artist.popularity ?? '—'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Top Genres Section */}
                <div className="mt-10 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/20">
                      <Sparkles className="w-5 h-5 text-purple-400"/>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Genre Distribution</h3>
                      <p className="text-slate-400">Your musical diversity</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      const genreCounts = {};
                      topArtists.forEach(a => {
                        (a.genres || []).forEach(g => {
                          genreCounts[g] = (genreCounts[g] || 0) + 1;
                        });
                      });
                      return Object.entries(genreCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 9)
                        .map(([genre, count], index) => (
                          <div 
                            key={genre} 
                            className="group relative p-4 rounded-xl border border-white/5 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-purple-900/20 hover:from-purple-800/30 hover:to-pink-800/30 transition-all duration-300 hover:scale-105"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                            
                            <div className="relative z-10 flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-bold shadow-lg">
                                {index + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-white font-medium truncate capitalize">{genre}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                                      style={{ 
                                        width: `${Math.min(100, (count / Math.max(...Object.values(genreCounts))) * 100)}%`,
                                        transitionDelay: `${index * 100}ms`
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-slate-400 text-sm font-medium">{count}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative z-10 text-center py-16">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mb-6">
                  <Users className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-400 text-lg">Connect your Spotify account to discover your top artists</p>
              </div>
            )}
          </section>
        </div>

        {/* AI Analysis Panel - Takes 1 column on large screens */}
        <div className="space-y-8">
          <section className={classNames(cardBase, 'p-8 group')}>
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative z-10 flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-400/20">
                  <Stars className="w-6 h-6 text-yellow-400"/>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Music Judge</h2>
                  <p className="text-slate-400">Deep insights into your taste</p>
                </div>
              </div>
              {analysis && (
                <div className="p-2 rounded-full bg-yellow-500/20 border border-yellow-400/30">
                  <Award className="w-5 h-5 text-yellow-300" />
                </div>
              )}
            </div>

            {!analysis ? (
              <div className="relative z-10 text-center py-12">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-6 border border-yellow-400/20">
                  <Stars className="w-10 h-10 text-yellow-400" />
                </div>
                
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  Load your music stats first, then unlock AI-powered insights about your unique musical personality and listening patterns.
                </p>
                
                <div className="space-y-4">
                  <button 
                    disabled={loading || topTracks.length === 0 || topArtists.length === 0} 
                    onClick={fetchAnalysis}
                    className={classNames(
                      buttonBase,
                      'w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin relative z-10"/>
                    ) : (
                      <Sparkles className="w-5 h-5 relative z-10"/>
                    )}
                    <span className="relative z-10">{loading ? 'Analyzing...' : 'Analyze My Taste'}</span>
                  </button>
                  
                  <button
                    disabled={loading || topTracks.length === 0 || topArtists.length === 0}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        setError('');
                        const accessToken = window.localStorage.getItem('spotify_token');
                        const response = await fetch('/api/critic', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
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
                    className={classNames(
                      buttonBase,
                      'w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin relative z-10"/>
                    ) : (
                      <Stars className="w-5 h-5 relative z-10"/>
                    )}
                    <span className="relative z-10">{loading ? 'Roasting...' : 'Get AI Roast'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative z-10 space-y-6">
                {/* Personality Summary */}
                <div className="relative group p-6 rounded-2xl border border-gradient-to-br from-yellow-400/20 to-orange-400/20 bg-gradient-to-br from-yellow-900/10 via-orange-900/10 to-yellow-900/10 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/30 to-orange-500/30">
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                      </div>
                      <h3 className="text-lg font-bold text-yellow-200">Your Musical DNA</h3>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {analysis.roastLevel && (
                          <span className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border border-yellow-400/30 text-yellow-200 font-semibold text-sm">
                            {analysis.roastLevel}
                          </span>
                        )}
                        {analysis.energyLevel && (
                          <span className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-600/30 to-red-600/30 border border-orange-400/30 text-orange-200 font-semibold text-sm">
                            {analysis.energyLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200 leading-relaxed text-lg">{analysis.verdict}</p>
                    </div>
                  </div>
                </div>

                {/* Audio Features Analysis */}
                {analysis.summary && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-emerald-400" />
                      Audio DNA Breakdown
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(analysis.summary).map(([key, value], index) => (
                        <div 
                          key={key} 
                          className="group relative p-4 rounded-xl border border-white/5 bg-gradient-to-r from-slate-800/30 to-slate-900/30 hover:from-slate-700/40 hover:to-slate-800/40 transition-all duration-300 hover:scale-[1.02]"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                          
                          <div className="relative z-10 flex items-center justify-between mb-3">
                            <span className="text-slate-300 font-medium capitalize">{key}</span>
                            <span className="text-white font-bold text-lg">
                              {key === 'tempo' ? `${Math.round(value||0)} BPM` : `${Math.round(((value||0)*100))}%`}
                            </span>
                          </div>
                          
                          <div className="relative w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full"></div>
                            <div 
                              className="relative h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 ease-out shadow-lg"
                              style={{ 
                                width: key === 'tempo' 
                                  ? `${Math.min(100, Math.max(0, ((value||0)-60)/1.4))}%` 
                                  : `${Math.round(((value||0)*100))}%`,
                                transitionDelay: `${index * 150}ms`
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/50 to-teal-300/50 rounded-full blur-sm"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Critique Section */}
                {analysis.aiCritique && (
                  <div className="relative group p-6 rounded-2xl border border-red-400/30 bg-gradient-to-br from-red-900/10 via-orange-900/10 to-red-900/10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/30 border border-red-400/30">
                          <Stars className="w-6 h-6 text-red-300"/>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-red-200">AI Critic's Verdict</h3>
                          <p className="text-red-300/70 text-sm">Brutal honesty about your music taste</p>
                        </div>
                      </div>
                      
                      <div className="p-6 rounded-xl bg-gradient-to-br from-red-950/30 to-orange-950/30 border border-red-400/20">
                        <pre className="text-red-100 whitespace-pre-wrap font-medium text-base leading-relaxed">
                          {analysis.aiCritique}
                        </pre>
                      </div>
                    </div>
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