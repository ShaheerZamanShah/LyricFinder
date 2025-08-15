import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { JUDGE_API_ENDPOINTS } from '../config/api';
import { LogIn, Loader2, Music2, Sparkles, Stars } from 'lucide-react';

function classNames(...xs) { return xs.filter(Boolean).join(' '); }

export default function Judge() {
  const { theme } = useTheme();
  const [auth, setAuth] = useState({ status: 'unknown', profile: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [top, setTop] = useState([]); // simplified tracks
  const [analysis, setAnalysis] = useState(null);

  const startAuth = useCallback(() => {
    window.location.href = JUDGE_API_ENDPOINTS.SPOTIFY_AUTH; // server will redirect back to /judge
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setError('');
      const token = window.localStorage.getItem('spotify_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      
      console.log('Fetching profile from:', JUDGE_API_ENDPOINTS.SPOTIFY_ME);
      const r = await fetch(JUDGE_API_ENDPOINTS.SPOTIFY_ME, { 
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

  const fetchTop = useCallback(async () => {
    try {
      setLoading(true); 
      setError(''); 
      setTop([]); 
      setAnalysis(null);
      
      console.log('Fetching top tracks from:', JUDGE_API_ENDPOINTS.SPOTIFY_ME_TOP_TRACKS);
      const r = await fetch(JUDGE_API_ENDPOINTS.SPOTIFY_ME_TOP_TRACKS, {
        credentials: 'include',
        mode: 'cors'
      });
      
      console.log('Top tracks response status:', r.status);
      if (r.status === 401) {
        console.log('Unauthorized, redirecting to auth');
        window.location.href = JUDGE_API_ENDPOINTS.SPOTIFY_AUTH;
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
      setTop(items);
    } catch (e) {
      console.error('Top tracks fetch error:', e);
      setError(e.message || 'Could not load your top tracks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true); 
      setError('');
      const ids = top.map(t => t.id).slice(0, 20);
      if (ids.length === 0) throw new Error('No tracks to analyze');
      
      // Use recommended batch analysis logic
      const featuresResp = await fetch(`${JUDGE_API_ENDPOINTS.SPOTIFY_AUDIO_FEATURES_BATCH}?ids=${ids.join(',')}`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!featuresResp.ok) throw new Error(`Audio features error: ${featuresResp.status}`);
      const featuresData = await featuresResp.json();
      const features = featuresData.audio_features || featuresData.features || [];
      
      const artistIds = Array.from(new Set(top.flatMap(t => t.artists?.map(a=>a.id).filter(Boolean) || []))).slice(0, 40);
      const artistsResp = await fetch(`${JUDGE_API_ENDPOINTS.SPOTIFY_ARTISTS}?ids=${encodeURIComponent(artistIds.join(','))}`, {
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

      // Placeholder AI verdict: simple heuristic until backend AI route exists
      const roastLevel = (summary.valence ?? 0.5) < 0.35 ? 'Brooding' : (summary.valence ?? 0.5) > 0.7 ? 'Sunny' : 'Balanced';
      const verdict = `Your vibe leans ${roastLevel.toLowerCase()}. Danceability ${Math.round((summary.danceability||0)*100)}%, energy ${Math.round((summary.energy||0)*100)}%, and a tempo around ${Math.round(summary.tempo||0)} BPM. Top genres: ${topGenres.map(g=>g.genre).join(', ') || '—'}.`;

      setAnalysis({ summary, topGenres, verdict, roastLevel });
    } catch (e) {
      console.error('Analysis error:', e);
      setError(e.message || 'Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, [top]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const buttonBase = 'inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white px-4 py-2 transition-colors';

  const disconnectSpotify = useCallback(() => {
    window.localStorage.removeItem('spotify_token');
    // Attempt to clear cookies (will only work for same-origin)
    document.cookie = 'spotify_access_token=; Max-Age=0; path=/;';
    document.cookie = 'spotify_refresh_token=; Max-Age=0; path=/;';
    setAuth({ status: 'unauth', profile: null });
    setTop([]);
    setAnalysis(null);
    setError('');
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <section className={classNames('rounded-2xl border border-white/15 bg-black/30 backdrop-blur-md p-6 md:p-8 shadow-xl')}
        aria-label="Judge page">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Stars className="w-6 h-6 text-white/90" /> Judge
            </h1>
            <p className="text-white/80">Connect your Spotify, fetch your top tracks, and let the Judge analyze your taste.</p>
          </div>
          {auth.status === 'ok' ? (
            <button className={buttonBase} onClick={disconnectSpotify} aria-label="Disconnect Spotify">
              <LogIn className="w-4 h-4 rotate-180" /> Disconnect Spotify
            </button>
          ) : (
            <button className={buttonBase} onClick={startAuth} aria-label="Connect Spotify">
              <LogIn className="w-4 h-4" /> Connect Spotify
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-white font-semibold mb-2 flex items-center gap-2"><Music2 className="w-5 h-5"/> Your Top Tracks</h2>
            {auth.status === 'ok' ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <button disabled={loading} className={buttonBase} onClick={fetchTop} aria-label="Load top tracks">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                    {loading ? 'Loading…' : 'Load your top tracks'}
                  </button>
                  <button disabled={loading || top.length===0} className={buttonBase} onClick={fetchAnalysis} aria-label="Analyze">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Stars className="w-4 h-4"/>}
                    {loading ? 'Analyzing…' : 'Analyze taste'}
                  </button>
                </div>
                {error && <div className="text-red-300 text-sm mb-2">{error}</div>}
                <ul className="space-y-2 max-h-80 overflow-auto pr-1">
                  {top.map(t => (
                    <li key={t.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition-colors">
                      {t.image ? <img src={t.image} alt="cover" className="w-10 h-10 rounded object-cover"/> : <div className="w-10 h-10 rounded bg-white/10"/>}
                      <div className="min-w-0">
                        <div className="text-white truncate">{t.title}</div>
                        <div className="text-white/70 text-sm truncate">{t.artist}</div>
                      </div>
                      <div className="ml-auto text-white/70 text-sm">{t.popularity ?? '—'}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-white/70">Sign in with Spotify to see your top tracks.</div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-white font-semibold mb-2">The Verdict</h2>
            {!analysis ? (
              <p className="text-white/70 text-sm">Run analysis to see your vibe, metrics, and a cheeky verdict.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-white/80 text-sm mb-2">Roast level</div>
                  <div className="text-white text-lg font-semibold">{analysis.roastLevel}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(analysis.summary).map(([k,v]) => (
                    <div key={k} className="rounded-lg border border-white/10 bg-white/5 p-2">
                      <div className="text-white/70 text-xs uppercase tracking-wide">{k}</div>
                      <div className="text-white font-medium">
                        {k === 'tempo' ? `${Math.round(v||0)} BPM` : `${Math.round(((v||0)*100))}%`}
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded mt-1 overflow-hidden">
                        <div className="h-full bg-white/70 transition-all duration-700" style={{ width: k==='tempo' ? `${Math.min(100, Math.round(((v||0)-60)/1.4))}%` : `${Math.round(((v||0)*100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-white/80 text-sm mb-2">Top genres</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topGenres.map(g => (
                      <span key={g.genre} className="text-sm text-white/90 border border-white/15 bg-white/5 rounded-full px-3 py-1">{g.genre}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-white/80 text-sm mb-2">Critic's note</div>
                  <p className="text-white/90 leading-relaxed">{analysis.verdict}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
