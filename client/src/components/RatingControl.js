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

export default function RatingControl({ song, className = '' }) {
  const [myRating, setMyRating] = useState(null);
  const [pendingValue, setPendingValue] = useState(5.0); // slider position
  const [avg, setAvg] = useState(null);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const userId = useMemo(() => getOrCreateUserId(), []);
  const songKey = useMemo(() => makeSongKey(song), [song]);
  const debounceRef = useRef(null);

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
          }
        } else if (!canceled) {
          setAvg(null); setCount(0);
        }
      } catch {
        if (!canceled) { setAvg(null); setCount(0); }
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
        setAvg(typeof data?.average === 'number' ? data.average : null);
        setCount(Number(data?.count || 0));
        try { window.localStorage.setItem(`rf_rating_${songKey}`, String(value)); } catch {}
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

  // Tailwind-styled range slider with visible value and aggregate
  return (
    <div className={`flex items-center gap-3 bg-white/10 border border-white/15 rounded-full px-4 py-2 backdrop-blur-sm ${className}`}>
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
        className="appearance-none w-40 sm:w-56 h-2 rounded-full bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
      />
      <div className="flex items-center gap-1 text-xs text-white/70">
        <span>Avg:</span>
        <span className="font-medium text-white/90">{avg != null ? avg.toFixed(2) : '–'}</span>
        {count ? <span>({count})</span> : null}
      </div>
      {saving && <span className="text-[10px] text-white/50">saving…</span>}
    </div>
  );
}
