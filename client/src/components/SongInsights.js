import React, { useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

// Small UI next to the vinyl: popularity gradient bar + audio features badges
const SongInsights = ({ spotifyId, title, artist, theme, coverColor }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolvedId, setResolvedId] = useState(spotifyId || null);

  // Gradient helpers for label bar and subtle background harmony
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const adjustColor = ({ r, g, b }, factor = 0.8) => ({
    r: clamp(Math.round(r * factor)),
    g: clamp(Math.round(g * factor)),
    b: clamp(Math.round(b * factor)),
  });
  const rgba = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const bgStyle = coverColor
    ? { background: `linear-gradient(135deg, ${rgba(coverColor, theme==='light'?0.12:0.10)} 0%, ${rgba(adjustColor(coverColor,0.75), theme==='light'?0.18:0.16)} 100%)` }
    : undefined;

  const popularityColorStops = useMemo(() => {
    // gradient: red -> orange -> green across 0-100
    return 'linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)';
  }, []);

  // Derive human-friendly vibes from audio features
  const computeVibes = (f = {}) => {
    const d = Number(f.danceability ?? 0);
    const e = Number(f.energy ?? 0);
    const v = Number(f.valence ?? 0);
    const a = Number(f.acousticness ?? 0);
    const i = Number(f.instrumentalness ?? 0);
    const s = Number(f.speechiness ?? 0);

    // Primary vibe by simple heuristics and priorities
    const tags = [];
    if (i >= 0.6) tags.push('Instrumental');
    if (s >= 0.33) tags.push('Speechy');
    if (d >= 0.75 && e >= 0.6 && v >= 0.55) tags.push('Party');
    if (d >= 0.7) tags.push('Danceable');
    if (e >= 0.7) tags.push('Energetic');
    if (e <= 0.35) tags.push('Chill');
    if (v >= 0.6) tags.push('Happy');
    if (v <= 0.35) tags.push('Sad');
    if (a >= 0.6) tags.push('Acoustic');

    // De-duplicate and limit
    const seen = new Set();
    const unique = tags.filter(t => (seen.has(t) ? false : (seen.add(t), true)));
    // Choose a primary vibe and up to 2 secondary for compact display
    const primary = unique[0] || null;
    const secondary = unique.slice(1, 3);
    return { primary, secondary, all: unique };
  };

  // Resolve a Spotify track ID if missing using preview endpoint with title+artist
  useEffect(() => {
    let active = true;
    async function resolveId() {
      if (resolvedId) return; // already have
      if (!title || !artist) return; // not enough info
      try {
        const q = `${title} ${artist}`;
        const resp = await fetch(`${API_ENDPOINTS.SPOTIFY_PREVIEW}?q=${encodeURIComponent(q)}`);
        if (resp.ok) {
          const json = await resp.json();
          if (json?.spotifyId && active) setResolvedId(json.spotifyId);
        }
      } catch {
        /* ignore */
      }
    }
    resolveId();
    return () => { active = false; };
  }, [title, artist, resolvedId]);

  // Load features whenever we have an ID (prop or resolved)
  useEffect(() => {
    let active = true;
    async function load() {
      const id = spotifyId || resolvedId;
      if (!id) return;
      setLoading(true);
      try {
        const resp = await fetch(`${API_ENDPOINTS.SPOTIFY_AUDIO_FEATURES}?track_id=${encodeURIComponent(id)}`);
        if (!resp.ok) throw new Error(`Failed to load audio features: ${resp.status}`);
        const json = await resp.json();
        if (active) setData(json);
      } catch (e) {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [spotifyId, resolvedId]);

  const popularity = Math.max(0, Math.min(100, Number(data?.popularity ?? 0)));
  const features = data?.features || {};
  const vibes = computeVibes(features);

  const textTone = theme === 'light' ? 'text-gray-900' : 'text-gray-100';
  const subTone = theme === 'light' ? 'text-gray-600' : 'text-gray-300';
  const chipBg = theme === 'light' ? 'bg-white/60' : 'bg-white/10';

  return (
    <div className={`w-full max-w-xs rounded-2xl p-3 shadow-md`} style={bgStyle}>
      {/* Vibe tags */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {vibes.primary ? (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-600/80 text-white shadow">
            {vibes.primary}
          </span>
        ) : null}
        {vibes.secondary.map((t) => (
          <span key={t} className={`px-2 py-0.5 rounded-full text-[10px] ${chipBg} ${subTone} border border-white/10`}>
            {t}
          </span>
        ))}
      </div>

      <div className={`text-xs font-semibold mb-1 ${subTone}`}>Popularity</div>
      <div className="w-full h-3 rounded-full relative overflow-hidden bg-gray-700/30">
        <div
          className="h-full rounded-full"
          style={{ width: `${popularity}%`, background: popularityColorStops, transition: 'width 400ms ease' }}
        />
        <div className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${textTone}`}>{popularity}</div>
      </div>

      <div className={`mt-3 text-xs font-semibold ${subTone}`}>Vibe</div>
  {loading ? (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 rounded-md bg-gray-500/20 animate-pulse" />
          ))}
        </div>
      ) : (
  <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { key: 'danceability', label: 'Dance', val: features.danceability },
            { key: 'energy', label: 'Energy', val: features.energy },
            { key: 'valence', label: 'Mood', val: features.valence },
            { key: 'acousticness', label: 'Acoustic', val: features.acousticness },
            { key: 'instrumentalness', label: 'Instr.', val: features.instrumentalness },
            { key: 'speechiness', label: 'Speech', val: features.speechiness },
          ].map(({ key, label, val }) => (
            <div key={key} className={`flex flex-col items-center justify-center h-10 rounded-md ${chipBg} backdrop-blur-sm`}>
              <div className={`text-[10px] ${subTone}`}>{label}</div>
              <div className={`text-xs font-semibold ${textTone}`}>{val != null ? Math.round(val * 100) : '–'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SongInsights;
