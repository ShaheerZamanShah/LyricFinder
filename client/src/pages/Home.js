import React, { useState, useEffect, useRef } from 'react';
import SearchForm from '../components/SearchForm';
import ArtistSection from '../components/ArtistSection';
import { Music, Play, Pause, ExternalLink } from 'lucide-react';
import ArtistList from '../components/ArtistList';
import { useTheme } from '../contexts/ThemeContext';
import useSpotify from '../hooks/useSpotify';
import { API_ENDPOINTS } from '../config/api';

const Home = ({ searchResult: externalResult, onSearchResults, onCollapseChange, isSearchCollapsed, onCoverColorChange }) => {
  const [searchResult, setSearchResult] = useState(externalResult || null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState(null);
  const [isLoadingRecommendationSong, setIsLoadingRecommendationSong] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [showLyric, setShowLyric] = useState(false);
  const [showFinder, setShowFinder] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const { theme } = useTheme();
  const { getRecommendations } = useSpotify();
  const searchContainerRef = useRef(null);

  // Fallback cover used when recommendation thumbnails fail
  const FALLBACK_COVER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjMyIiB5PSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIyNCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg==';

  // Dominant color extracted from the main album cover
  const [coverColor, setCoverColor] = useState(null);

  // Lightweight dominant color extractor with safe fallback
  const extractDominantColor = (imgEl) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      const w = Math.min(32, imgEl.naturalWidth || 32);
      const h = Math.min(32, imgEl.naturalHeight || 32);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(imgEl, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 16) continue; // ignore near-transparent
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (!count) return null;
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      return { r, g, b };
    } catch (e) {
      return null;
    }
  };

  // Preload an image by URL with CORS enabled and extract dominant color
  const computeDominantColorFromUrl = (url) => {
    if (!url) { setCoverColor(null); onCoverColorChange?.(null); return; }
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.loading = 'eager';
      img.onload = () => {
        const col = extractDominantColor(img);
        setCoverColor(col);
        onCoverColorChange?.(col || null);
      };
      img.onerror = () => { setCoverColor(null); onCoverColorChange?.(null); };
      img.src = url;
    } catch {
      setCoverColor(null);
      onCoverColorChange?.(null);
    }
  };

  const clamp = (v) => Math.max(0, Math.min(255, v));
  const adjustColor = ({ r, g, b }, factor = 0.8) => ({
    r: clamp(Math.round(r * factor)),
    g: clamp(Math.round(g * factor)),
    b: clamp(Math.round(b * factor)),
  });
  const rgba = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const getLyricsBackground = (color, theme) => {
    const darken = adjustColor(color, 0.65);
    const a1 = theme === 'light' ? 0.85 : 0.7;
    const a2 = theme === 'light' ? 0.95 : 0.85;
    return `linear-gradient(135deg, ${rgba(color, a1)} 0%, ${rgba(darken, a2)} 100%)`;
  };

  // Fast, robust lyrics cleaner. Removes pre-lyrics clutter and normalizes spacing/sections.
  const normalizeLyrics = (raw) => {
    if (!raw || typeof raw !== 'string') return '';
    let text = raw.replace(/\r\n?/g, '\n');

    // Remove common pre/post clutter
    // - Leading/trailing whitespace
    // - "Lyrics" headers, timestamps, or trailing "Embed" markers
    text = text
      .replace(/^\s*lyrics\s*$/gim, '')
      .replace(/^\s*([0-9]{1,2}:[0-9]{2})\s*$/gim, '')
      .replace(/\n?\s*\d+embed\s*$/i, '')
      .replace(/\u200B|\uFEFF/g, '')
      .trim();

    // Ensure section headers like [Chorus] or (Chorus) have spacing around them
    text = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s*\n\s*\[(.+?)\]\s*\n\s*/g, '\n\n[$1]\n')
      .replace(/\s*\n\s*\((.+?:?)\)\s*\n\s*/g, '\n\n($1)\n');

    // Collapse runs of blank lines to max 2
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  };

  // Parse featured artists from common title patterns: feat./ft./featuring ...
  const parseFeaturedArtists = (title = '') => {
    if (!title || typeof title !== 'string') return [];
    const patterns = [
      /\((?:feat\.|featuring|ft\.)\s*([^\)]+)\)/i,
      /-\s*(?:feat\.|featuring|ft\.)\s*([^\-]+)$/i,
      /(?:feat\.|featuring|ft\.)\s*([^\(\-\[]+)/i,
    ];
    let names = [];
    for (const re of patterns) {
      const m = title.match(re);
      if (m && m[1]) {
        names = m[1]
          .split(/,|&|x|\+|\band\b/i)
          .map(s => s.replace(/[\[\](){}]/g, '').trim())
          .filter(Boolean);
        break;
      }
    }
    // De-duplicate and limit to a reasonable amount
    const seen = new Set();
    const out = [];
    for (const n of names) {
      const key = n.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(n); }
    }
    return out;
  };

  useEffect(() => {
    setSearchResult(externalResult || null);
  }, [externalResult]);

  // Reset cover color when the album image changes
  useEffect(() => {
    setCoverColor(null);
    onCoverColorChange?.(null);
  }, [searchResult?.song?.image, onCoverColorChange]);

  // Collapse on outside click only when results exist
  useEffect(() => {
    const handleDocMouseDown = (e) => {
      const toggleClicked = e.target.closest?.('[data-search-toggle]');
      if (toggleClicked) return;
      if (!searchContainerRef.current) return;
      const clickedInside = searchContainerRef.current.contains(e.target);
      // CLEAN REWRITE
      import React, { useState, useEffect, useRef, useMemo } from 'react';
      import SearchForm from '../components/SearchForm';
      import ArtistList from '../components/ArtistList';
      import { Music, Play, Pause, ExternalLink } from 'lucide-react';
      import { useTheme } from '../contexts/ThemeContext';
      import useSpotify from '../hooks/useSpotify';
      import { API_ENDPOINTS } from '../config/api';

      const FALLBACK_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0ibm9uZSIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNODQgNjR2NzIuMTRhMjQgMjQgMCAxIDAgMTIgMjAuNzZWNjRIMTQuNjI1YTIgMiAwIDAgMCAwIDRoNjkuMzc1Wk0xMzYgNjR2OTIuMTRiLTUuNzgtMy4yNi0xMi0yLjY2LTEyLTEwLjE0VjY0aC00OC4wMWEyIDIgMCAwIDAgMCA0SDEyMGExNiAxNiAwIDAgMSAxNiAxNnptLTE2IDk2YTggOCAwIDEgMSAwLTE2IDggOCAwIDAgMSAwIDE2eiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==';

      // Parse (feat./ft./featuring ...) segments from the title
      function parseFeatured(title = '') {
        const PATTERNS = [/(?:\(|-\s*)(?:feat\.|ft\.|featuring)\s+([^\)\-]+)/i];
        for (const re of PATTERNS) {
          const m = title.match(re);
          if (m && m[1]) {
            return m[1]
              .split(/,|&|x|\+|\band\b/i)
              .map(s => s.replace(/[\[\](){}]/g, '').trim())
              .filter(Boolean);
          }
        }
        return [];
      }

      function dedupe(list) {
        const seen = new Set();
        return list.filter(n => {
          const key = n.toLowerCase();
          if (seen.has(key)) return false; seen.add(key); return true;
        });
      }

      function cleanLyrics(raw) {
        if (!raw) return '';
        return raw
          .replace(/\r\n?/g, '\n')
          .replace(/^\s*lyrics\s*$/gim, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      const Home = ({ searchResult: initial, onSearchResults, onCollapseChange, isSearchCollapsed }) => {
        const { theme } = useTheme();
        const { getRecommendations } = useSpotify();
        const [result, setResult] = useState(initial || null);
        const [isPlaying, setIsPlaying] = useState(false);
        const [audio, setAudio] = useState(null);
        const [showLyricsModal, setShowLyricsModal] = useState(false);
        const [recsLoading, setRecsLoading] = useState(false);
        const [recSongLoading, setRecSongLoading] = useState(false);
        const searchRef = useRef(null);

        // Aggregate artists each render from available sources
        const aggregatedArtists = useMemo(() => {
          const song = result?.song;
          if (!song) return [];
          const primary = song.artist || song.artists?.[0]?.name;
          const structured = (song.artists || []).map(a => a.name).filter(Boolean);
          const featured = (song.featured_artists || []).filter(Boolean);
          const parsed = parseFeatured(song.title || '');
          const all = [primary, ...structured, ...featured, ...parsed].filter(Boolean);
          return dedupe(all).map(n => ({ name: n }));
        }, [result]);

        useEffect(() => { setResult(initial || null); }, [initial]);

        // Collapse when clicking outside (only if we have a song shown)
        useEffect(() => {
          function onDoc(e) {
            if (!result?.song) return;
            if (!searchRef.current) return;
            if (!searchRef.current.contains(e.target)) onCollapseChange?.(true);
          }
          document.addEventListener('mousedown', onDoc);
          return () => document.removeEventListener('mousedown', onDoc);
        }, [result, onCollapseChange]);

        // Cleanup audio on unmount
        useEffect(() => () => { if (audio) audio.pause(); }, [audio]);

        async function enrichWithSpotify(song) {
          try {
            if (song.preview_url && song.spotify_url) return song; // already enriched
            const resp = await fetch(`${API_ENDPOINTS.SPOTIFY_PREVIEW}?q=${encodeURIComponent(`${song.title} ${song.artist}`)}`);
            if (!resp.ok) return song;
            const data = await resp.json();
            return {
              ...song,
              image: data.cover || song.image,
              preview_url: data.preview || song.preview_url,
              preview_source: data.source || song.preview_source,
              spotify_url: data.spotifyUrl || song.spotify_url,
              spotify_id: data.spotifyId || song.spotify_id,
              artists: Array.isArray(data.artists) ? data.artists : song.artists,
              album_artists: Array.isArray(data.albumArtists) ? data.albumArtists : song.album_artists,
            };
          } catch { return song; }
        }

        function attachFeatured(song) {
          if (!song) return song;
          if (!song.featured_artists || !song.featured_artists.length) {
            if (Array.isArray(song.artists) && song.artists.length > 1) {
              const primary = song.artist || song.artists[0].name;
              song.featured_artists = song.artists
                .map(a => a.name)
                .filter(n => n && n.toLowerCase() !== primary?.toLowerCase());
            } else {
              song.featured_artists = parseFeatured(song.title);
            }
          }
          return song;
        }

        async function handleSearchResults(r) {
          if (audio) { audio.pause(); setIsPlaying(false); setAudio(null); }
          if (!r || !r.song) { setResult(r); onSearchResults?.(r); return; }
          r.song.lyrics = cleanLyrics(r.song.lyrics);
          attachFeatured(r.song);
          setResult(r); // immediate UI
          onSearchResults?.(r);
          // Async enrichment (preview, spotify, youtube, recs)
          (async () => {
            const enrichedSong = await enrichWithSpotify(r.song);
            try {
              const yt = await fetch(`${API_ENDPOINTS.YOUTUBE_LINK}?q=${encodeURIComponent(`${enrichedSong.title} ${enrichedSong.artist}`)}`);
              if (yt.ok) {
                const yd = await yt.json();
                if (yd?.url) enrichedSong.youtube_url = yd.url;
              }
            } catch {}
            setRecsLoading(true);
            try {
              if (enrichedSong.spotify_id) {
                const recs = await getRecommendations(enrichedSong.spotify_id, enrichedSong.artist);
                enrichedSong.recommendations = recs.map((rec, i) => ({
                  id: rec.id || `rec_${i}`,
                  title: rec.title,
                  artist: rec.artist,
                  thumbnail: rec.image || FALLBACK_IMG
                }));
              }
            } catch {
              enrichedSong.recommendations = [];
            }
            setRecsLoading(false);
            setResult(prev => prev ? { ...prev, song: { ...enrichedSong } } : prev);
          })();
        }

        async function handleRecClick(rec) {
          if (!rec) return;
          setRecSongLoading(true);
          try {
            const resp = await fetch(API_ENDPOINTS.SEARCH_LYRICS, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: rec.title, artist: rec.artist })
            });
            if (!resp.ok) return;
            const r = await resp.json();
            if (r?.song) {
              r.song.lyrics = cleanLyrics(r.song.lyrics);
              attachFeatured(r.song);
              setResult(r);
              // enrich
              handleSearchResults(r);
              window.scrollTo({ top: 160, behavior: 'smooth' });
            }
          } finally { setRecSongLoading(false); }
        }

        async function togglePlay() {
          if (!result?.song?.preview_url) return;
          if (audio) {
            if (isPlaying) { audio.pause(); setIsPlaying(false); return; }
            await audio.play(); setIsPlaying(true); return;
          }
          const a = new Audio(result.song.preview_url);
          a.onended = () => setIsPlaying(false);
          try { await a.play(); setAudio(a); setIsPlaying(true); } catch { /* ignore */ }
        }

        const textTone = theme === 'light' ? 'text-gray-900' : 'text-gray-100';

        return (
          <div className={`min-h-screen px-4 py-6 ${textTone}`}>
            {/* Search */}
            <div ref={searchRef} className={`max-w-xl mx-auto transition-all duration-300 ${isSearchCollapsed ? 'opacity-0 -translate-y-2 pointer-events-none h-0' : 'opacity-100 translate-y-0'} ${!isSearchCollapsed && !result?.song ? 'mt-24 md:mt-36' : 'mt-2'}`}>
              <SearchForm onSearchResults={handleSearchResults} onCollapseChange={onCollapseChange} />
            </div>

            {result?.song && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start max-w-7xl mx-auto">
                {/* Left Panel */}
                <div className={`p-6 rounded-2xl shadow-lg backdrop-blur-md ${theme === 'light' ? 'bg-white/60' : theme === 'medium' ? 'bg-gray-800/60' : 'bg-black/50'}`}>
                  <div className="flex flex-row gap-6 items-start">
                    {/* Vinyl */}
                    <button onClick={togglePlay} className={`relative group w-44 h-44 rounded-full flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-transform ${isPlaying ? 'animate-spin-slow' : ''}`}
                      title={result.song.preview_url ? (isPlaying ? 'Pause preview' : 'Play preview') : 'No preview available'}>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-inner" />
                      <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-gray-700/40 to-gray-900/40" />
                      <img src={result.song.image || FALLBACK_IMG} alt="cover" className="absolute inset-[22%] w-[56%] h-[56%] rounded-full object-cover shadow" onError={e=>{e.currentTarget.src=FALLBACK_IMG;}} />
                      {result.song.preview_url && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition" >
                          {isPlaying ? <Pause className="w-10 h-10 text-white drop-shadow"/> : <Play className="w-10 h-10 text-white ml-1 drop-shadow"/>}
                        </div>
                      )}
                    </button>
                    {/* Artists */}
                    <div className="flex-1 min-w-[140px]">
                      <h2 className="text-xl font-semibold mb-3">Artists</h2>
                      <ArtistList artists={aggregatedArtists} primary={result.song.artist} />
                      {result.song.album && <div className="text-xs mt-3 opacity-70">Album: {result.song.album}</div>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    {result.song.youtube_url ? (
                      <a className="btn-red" href={result.song.youtube_url} target="_blank" rel="noopener noreferrer">YouTube</a>
                    ) : (
                      <a className="btn-red" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(result.song.title + ' ' + result.song.artist)}`} target="_blank" rel="noopener noreferrer">YouTube</a>
                    )}
                    {result.song.spotify_url ? (
                      <a className="btn-green" href={result.song.spotify_url} target="_blank" rel="noopener noreferrer">Spotify</a>
                    ) : (
                      <a className="btn-green" href={`https://open.spotify.com/search/${encodeURIComponent(result.song.title + ' ' + result.song.artist)}`} target="_blank" rel="noopener noreferrer">Spotify</a>
                    )}
                    {(result.song.external_url || result.song.genius_url) && (
                      <a className="inline-flex items-center px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium shadow" href={result.song.external_url || result.song.genius_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1"/> Source
                      </a>
                    )}
                  </div>

                  {/* Lyrics Preview */}
                  {result.song.lyrics && (
                    <div className={`mt-6 p-5 rounded-xl max-h-80 overflow-y-auto cursor-pointer shadow-inner transition hover:shadow-lg ${theme==='light'?'bg-gray-900 text-gray-100':'bg-gray-800/70 text-gray-100'}`} onClick={()=>setShowLyricsModal(true)} title="Click to expand lyrics">
                      <h3 className="flex items-center gap-2 font-semibold mb-3"><Music className="w-5 h-5"/>Lyrics</h3>
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono">{result.song.lyrics}</pre>
                    </div>
                  )}

                  {/* Recommendations */}
                  {(recsLoading || result.song.recommendations?.length) && (
                    <div className="mt-8">
                      <h4 className="font-semibold mb-3">Other Songs</h4>
                      {recsLoading ? (
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-28 rounded-lg bg-gray-600/20 animate-pulse"/>))}</div>
                      ) : (
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                          {result.song.recommendations.map(r => (
                            <button key={r.id} onClick={()=>!recSongLoading && handleRecClick(r)} className={`group relative p-3 rounded-lg text-left bg-gray-700/30 hover:bg-gray-700/50 transition shadow ${recSongLoading?'opacity-60 pointer-events-none':''}`} title={`View lyrics: ${r.title} – ${r.artist}`}>
                              <img src={r.thumbnail || FALLBACK_IMG} alt={r.title} className="w-14 h-14 rounded object-cover mb-2 mx-auto" onError={e=>{e.currentTarget.src=FALLBACK_IMG;}} />
                              <div className="text-xs font-semibold truncate">{r.title}</div>
                              <div className="text-[10px] opacity-70 truncate">{r.artist}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Panel (placeholder for future artist bio etc.) */}
                <div className="hidden lg:block opacity-60 text-sm">
                  <p>Select a recommendation to explore more tracks and lyrics.</p>
                </div>
              </div>
            )}

            {/* Modal */}
            {showLyricsModal && result?.song?.lyrics && (
              <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={()=>setShowLyricsModal(false)}>
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                <div className={`relative max-w-3xl w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl ${theme==='light'?'bg-white':'bg-gray-900'}`} onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-600/30">
                    <div>
                      <h2 className="text-xl font-bold">{result.song.title}</h2>
                      <p className="text-sm opacity-70">{aggregatedArtists.map(a=>a.name).join(', ')}</p>
                    </div>
                    <button onClick={()=>setShowLyricsModal(false)} className="p-2 rounded hover:bg-gray-600/30" aria-label="Close lyrics">✕</button>
                  </div>
                  <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)] text-sm leading-relaxed font-mono whitespace-pre-wrap">
                    {result.song.lyrics}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      };

      export default Home;
                image: previewData.cover || searchResult.song.image,
