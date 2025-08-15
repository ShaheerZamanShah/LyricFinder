import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';

const getOrCreateUserId = () => {
  try {
    let id = window.localStorage.getItem('rf_user_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem('rf_user_id', id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
};

const makeSongKey = (song) => {
  if (song?.spotify_id) return `spotify:${song.spotify_id}`;
  const t = (song?.title || '').trim().toLowerCase();
  const a = (song?.artist || '').trim().toLowerCase();
  return `meta:${t}::${a}`;
};

export default function RatingControl({ song, color, className = '' }) {
  const [myRating, setMyRating] = useState(null);
  const [pendingValue, setPendingValue] = useState(5.0); // slider position
  const [avg, setAvg] = useState(null);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [touched, setTouched] = useState(false);
  const userId = useMemo(() => getOrCreateUserId(), []);
  const songKey = useMemo(() => makeSongKey(song), [song]);
  const debounceRef = useRef(null);

  // If the song gains a spotify_id after initial render, migrate any stored rating
  useEffect(() => {
    if (!song || !song.spotify_id) return;
    try {
      const metaKey = makeSongKey({ title: song.title, artist: song.artist });
      const spotifyKey = makeSongKey({ spotify_id: song.spotify_id });
      if (metaKey !== spotifyKey) {
        const stored = window.localStorage.getItem(`rf_rating_${metaKey}`);
        if (stored != null && window.localStorage.getItem(`rf_rating_${spotifyKey}`) == null) {
          window.localStorage.setItem(`rf_rating_${spotifyKey}`, stored);
          // Also migrate aggregate cache if present
          const agg = window.localStorage.getItem(`rf_rating_agg_${metaKey}`);
          if (agg) window.localStorage.setItem(`rf_rating_agg_${spotifyKey}`, agg);
        }
      }
    } catch {}
  }, [song?.spotify_id]);

  // Load my rating from localStorage and fetch aggregate
  useEffect(() => {
    if (!song) return;
    // personal rating
    try {
      const stored = window.localStorage.getItem(`rf_rating_${songKey}`);
      if (stored != null) {
        const v = Number(stored);
        setMyRating(v);
        setPendingValue(isFinite(v) ? v : 5);
      } else {
        setMyRating(null);
        setPendingValue(5);
      }
    } catch {
      setMyRating(null);
      setPendingValue(5);
    }

    // average/count
    let canceled = false;
    // optimistic: use cached aggregate while fetching
    try {
      const cached = window.localStorage.getItem(`rf_rating_agg_${songKey}`);
      if (cached) {
        const { average, count } = JSON.parse(cached);
        if (typeof average === 'number') setAvg(average);
        if (typeof count === 'number') setCount(count);
      }
    } catch {}
    (async () => {
      try {
        const params = new URLSearchParams();
        if (song.spotify_id) params.set('spotify_id', song.spotify_id);
        else { params.set('title', song.title || ''); params.set('artist', song.artist || ''); }
        const resp = await fetch(`${API_ENDPOINTS.RATINGS}?${params.toString()}`);
        if (resp.ok) {
          const data = await resp.json();
          if (!canceled) {
            setAvg(typeof data?.average === 'number' ? data.average : null);
            setCount(Number(data?.count || 0));
            try { window.localStorage.setItem(`rf_rating_agg_${songKey}`, JSON.stringify({ average: data?.average ?? null, count: Number(data?.count || 0) })); } catch {}
          }
        } else if (!canceled) {
          // keep previous or cached values; don't force to 0
        }
      } catch {
        // keep previous or cached values on error
      }
    })();
    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songKey]);

  const submit = async (value) => {
    if (!song) return;
    setSaving(true);
    try {
      const body = { userId, rating: Number(value) };
      if (song.spotify_id) body.spotify_id = song.spotify_id; else { body.title = song.title; body.artist = song.artist; }
      const resp = await fetch(API_ENDPOINTS.RATINGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        const data = await resp.json();
        // Optimistically reflect your rating; use server average when present
        setAvg(typeof data?.average === 'number' ? data.average : Number(value));
        setCount(Math.max(1, Number(data?.count || 1)));
        try { window.localStorage.setItem(`rf_rating_${songKey}`, String(value)); } catch {}
  try { window.localStorage.setItem(`rf_rating_agg_${songKey}`, JSON.stringify({ average: data?.average ?? null, count: Number(data?.count || 0) })); } catch {}
        setMyRating(Number(value));
      }
    } finally {
      setSaving(false);
    }
  };

  // Debounced submit on slider change
  const scheduleSubmit = (value) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => submit(value), 350);
  };

  const onChange = (e) => {
    const v = Number(e.target.value);
    setPendingValue(v);
    setTouched(true);
    scheduleSubmit(v);
  };

  const onCommit = () => {
    if (!touched) return;
    scheduleSubmit(pendingValue);
  };

  // Background color from album
  const chipStyle = useMemo(() => {
    if (!color) return {};
    const { r = 60, g = 60, b = 60 } = color || {};
    const bg = `linear-gradient(135deg, rgba(${r},${g},${b},0.20) 0%, rgba(${r},${g},${b},0.35) 100%)`;
    const brd = `rgba(${r},${g},${b},0.45)`;
    return { background: bg, borderColor: brd };
  }, [color]);

  // Collapsed by default: show aggregate; expand on click to reveal slider and personal rating
  return (
    <div
      className={`group flex items-center gap-3 rounded-full px-4 py-2 backdrop-blur-sm border transition-all duration-300 ${className}`}
      style={chipStyle}
      role="region"
      aria-label="Song rating"
    >
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          aria-expanded={expanded}
          aria-controls="rating-slider"
        >
          <span className="text-xs opacity-80">Rating</span>
          <span className="text-sm font-semibold tabular-nums">{avg != null ? avg.toFixed(2) : '–'}</span>
          {count ? <span className="text-xs opacity-70">({count})</span> : null}
        </button>
      )}

      <div
        id="rating-slider"
        className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${expanded ? 'w-auto opacity-100 ml-1' : 'w-0 opacity-0'} `}
        aria-hidden={!expanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/80 whitespace-nowrap">Your rating</span>
          <span className="text-sm font-semibold text-white/90 tabular-nums min-w-10 text-right">{(touched ? pendingValue : (myRating ?? pendingValue)).toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={pendingValue}
          onChange={onChange}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          aria-label="Rate this song from 0 to 10 in steps of 0.5"
          className="appearance-none w-40 sm:w-56 h-2 rounded-full bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-white/70 hover:text-white/90 px-2 py-1 rounded-full border border-white/15"
          aria-label="Close rating controls"
        >
          Done
        </button>
      </div>
    </div>
  );
}
