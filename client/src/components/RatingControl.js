import React, { useEffect, useMemo, useState } from 'react';
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
  const [avg, setAvg] = useState(null);
  const [count, setCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const userId = useMemo(() => getOrCreateUserId(), []);
  const songKey = useMemo(() => makeSongKey(song), [song]);

  // Build options 0.0 - 10.0 step 0.5
  const options = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 20; i++) {
      arr.push((i * 0.5).toFixed(1));
    }
    return arr;
  }, []);

  // Load my rating from localStorage and fetch aggregate
  useEffect(() => {
    if (!song) return;
    try {
      const stored = window.localStorage.getItem(`rf_rating_${songKey}`);
      if (stored != null) setMyRating(Number(stored));
    } catch {}

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
        } else {
          if (!canceled) { setAvg(null); setCount(0); }
        }
      } catch {
        if (!canceled) { setAvg(null); setCount(0); }
      }
    })();
    return () => { canceled = true; };
  }, [song, songKey]);

  const submit = async (value) => {
    if (!song) return;
    setSaving(true);
    try {
      const body = {
        userId,
        rating: Number(value),
      };
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
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-2 backdrop-blur-sm ${className}`}>
      <span className="text-xs text-white/80">Rate</span>
      <select
        value={myRating == null ? '' : String(myRating.toFixed(1))}
        onChange={(e) => { const v = Number(e.target.value); setMyRating(v); submit(v); }}
        className="text-sm bg-transparent text-white outline-none cursor-pointer"
        disabled={saving}
      >
        <option value="" disabled hidden>Select</option>
        {options.map((v) => (
          <option key={v} value={v} className="bg-gray-900 text-white">{v}</option>
        ))}
      </select>
      <span className="text-xs text-white/70">Avg: {avg != null ? avg.toFixed(2) : '–'}{count ? ` (${count})` : ''}</span>
    </div>
  );
}
