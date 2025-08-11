import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

const SongDetails = ({ title, artist, theme, coverColor }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Match Home.js gradient style for dynamic backgrounds
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const adjustColor = ({ r, g, b }, factor = 0.8) => ({
    r: clamp(Math.round(r * factor)),
    g: clamp(Math.round(g * factor)),
    b: clamp(Math.round(b * factor)),
  });
  const rgba = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const getLyricsBackground = (color, th) => {
    const darken = adjustColor(color, 0.65);
    const a1 = th === 'light' ? 0.85 : 0.7;
    const a2 = th === 'light' ? 0.95 : 0.85;
    return `linear-gradient(135deg, ${rgba(color, a1)} 0%, ${rgba(darken, a2)} 100%)`;
  };

  useEffect(() => {
    let active = true;
    async function fetchDetails() {
      if (!title) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('title', title);
        if (artist) params.set('artist', artist);
        const resp = await fetch(`${API_ENDPOINTS.GENIUS_DETAILS}?${params.toString()}`);
        if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
        const data = await resp.json();
        if (active) setDetails(data.details || null);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchDetails();
    return () => { active = false; };
  }, [title, artist]);

  if (loading) {
    return (
      <div className={`rounded-2xl p-5 shadow-md mt-4 ${theme==='light' ? 'bg-gray-100' : 'bg-gray-800/60'}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 bg-gray-400/40 rounded"/>
          <div className="h-4 w-full bg-gray-400/30 rounded"/>
          <div className="h-4 w-11/12 bg-gray-400/30 rounded"/>
          <div className="h-4 w-10/12 bg-gray-400/30 rounded"/>
        </div>
      </div>
    );
  }

  if (error || !details) return null;

  return (
    <div
      className={`rounded-2xl p-5 shadow-md mt-4 ${
        theme === 'light' ? 'bg-white/70' : 'bg-black/40'
      }`}
      style={coverColor ? { background: getLyricsBackground(coverColor, theme) } : undefined}
    >
      <div className="flex items-start gap-4">
        {details.image && (
          <img src={details.image} alt={details.title} className="w-16 h-16 rounded object-cover shadow" loading="lazy" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-base font-semibold ${theme==='light' ? 'text-gray-900' : 'text-gray-100'}`}>About this song</h3>
            {details.url && (
              <a href={details.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300">
                View on Genius <ExternalLink className="w-3 h-3 ml-1"/>
              </a>
            )}
          </div>
          {details.description ? (
            <p className={`mt-2 text-sm leading-relaxed ${theme==='light' ? 'text-gray-700' : 'text-gray-300'}`}>{details.description}</p>
          ) : details.description_preview ? (
            <p className={`mt-2 text-sm leading-relaxed italic ${theme==='light' ? 'text-gray-600' : 'text-gray-400'}`}>{details.description_preview}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            {details.release_date && (
              <span className={`${theme==='light' ? 'text-gray-600' : 'text-gray-400'}`}>Released: {details.release_date}</span>
            )}
            {details.pageviews && (
              <span className={`${theme==='light' ? 'text-gray-600' : 'text-gray-400'}`}>Pageviews: {details.pageviews.toLocaleString?.() || details.pageviews}</span>
            )}
            {details.album?.name && (
              <span className={`${theme==='light' ? 'text-gray-600' : 'text-gray-400'}`}>Album: {details.album.name}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongDetails;
