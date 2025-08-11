import React, { useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

// Small UI next to the vinyl: popularity gradient bar + audio features badges
const SongInsights = ({ spotifyId, theme, coverColor }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    let active = true;
    async function load() {
      if (!spotifyId) return;
      setLoading(true);
      try {
        const resp = await fetch(`${API_ENDPOINTS.SPOTIFY_AUDIO_FEATURES}?track_id=${encodeURIComponent(spotifyId)}`);
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
  }, [spotifyId]);

  if (!spotifyId) return null;

  const popularity = Math.max(0, Math.min(100, Number(data?.popularity ?? 0)));
  const features = data?.features || {};

  const textTone = theme === 'light' ? 'text-gray-900' : 'text-gray-100';
  const subTone = theme === 'light' ? 'text-gray-600' : 'text-gray-300';
  const chipBg = theme === 'light' ? 'bg-white/60' : 'bg-white/10';

  return (
    <div className={`w-full max-w-xs rounded-2xl p-3 shadow-md`} style={bgStyle}>
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
