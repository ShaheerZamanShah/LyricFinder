import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';

const PopularityMeter = ({ songId, title, artist }) => {
  const [popularity, setPopularity] = useState(0);
  const [vibe, setVibe] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSongData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ensure we have a Spotify track ID; if missing, resolve via preview endpoint
        let trackId = songId;
        if (!trackId && title && artist) {
          const previewResp = await fetch(`${API_ENDPOINTS.SPOTIFY_PREVIEW}?q=${encodeURIComponent(`${title} ${artist}`)}`);
          if (previewResp.ok) {
            const previewJson = await previewResp.json();
            if (previewJson?.spotifyId) trackId = previewJson.spotifyId;
          }
        }

        if (!trackId) {
          setPopularity(0);
          setVibe('Unknown vibe');
          setLoading(false);
          return;
        }

        // Our backend returns both popularity and features from this endpoint
        const featuresResponse = await fetch(`${API_ENDPOINTS.SPOTIFY_AUDIO_FEATURES}?track_id=${encodeURIComponent(trackId)}`);
        if (!featuresResponse.ok) throw new Error('Failed to load audio features');
        const payload = await featuresResponse.json();
        const features = payload?.features || {};

        // Set popularity (0-100 scale from Spotify)
        setPopularity(Math.max(0, Math.min(100, Number(payload?.popularity || 0))));

        // Generate vibe description based on audio features
        const vibeDescription = generateVibeDescription(features);
        setVibe(vibeDescription);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch song data');
        setLoading(false);
      }
    };

    fetchSongData();
  }, [songId, title, artist]);

  // Function to generate a vibe description based on Spotify audio features
  const generateVibeDescription = (features) => {
    if (!features) return 'Unknown vibe';
    const energy = Number(features.energy ?? 0);
    const valence = Number(features.valence ?? 0);
    const danceability = Number(features.danceability ?? 0);
    if (energy > 0.7 && danceability > 0.7) return 'Upbeat & Danceable';
    if (valence < 0.3) return 'Moody & Introspective';
    if (energy < 0.4 && valence > 0.6) return 'Chill & Happy';
    return 'Balanced & Groovy';
  };

  if (loading) return <div className="text-center text-gray-500">Loading...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;

  return (
    <div className="w-64 mx-auto my-4 p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Popularity</h3>
      <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${popularity}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-600 mt-1">{popularity}/100</p>
      <p className="text-sm text-gray-700 mt-2 italic">Vibe: {vibe}</p>
    </div>
  );
};

export default PopularityMeter;
