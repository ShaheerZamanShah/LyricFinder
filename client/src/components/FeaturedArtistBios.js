import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Music, Loader, Users } from 'lucide-react';
import { fetchArtistInfo } from '../api/artistInfo';

// Compact bios for featured artists shown below the main ArtistBio
export default function FeaturedArtistBios({ names = [], coverColor = null, limit = 2 }) {
  const { theme } = useTheme();
  const [bios, setBios] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const uniqueNames = Array.from(new Set((names || []).map(n => (n || '').trim()).filter(Boolean))).slice(0, limit);
    if (uniqueNames.length === 0) { setBios([]); return; }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const results = await Promise.all(uniqueNames.map(async (n) => {
          try {
            const data = await fetchArtistInfo(n);
            if (!data) return null;
            return { name: data.name || n, image: data.image || null, bio: data.bio || 'No biography available.' };
          } catch {
            return null;
          }
        }));
        if (!cancelled) setBios(results.filter(Boolean));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [names, limit]);

  if (loading) {
    return (
      <div className={`p-4 rounded-xl border backdrop-blur-md flex items-center gap-2 ${
        theme === 'light' ? 'bg-white/90 border-gray-200' : theme === 'medium' ? 'bg-gray-700/90 border-gray-600' : 'bg-gray-800/90 border-gray-700'
      }`}>
        <Loader className="w-4 h-4 animate-spin text-indigo-500" />
        <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>Loading featured artist info…</span>
      </div>
    );
  }

  if (!bios.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className={theme === 'light' ? 'text-gray-900' : 'text-white'} size={18} />
        <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Featured {bios.length > 1 ? 'Artists' : 'Artist'}</h3>
      </div>
      {bios.map((b, idx) => (
        <FeaturedBioCard key={idx} bio={b} theme={theme} coverColor={coverColor} />
      ))}
    </section>
  );
}

function FeaturedBioCard({ bio, theme, coverColor }) {
  const [imageError, setImageError] = useState(false);
  const showFallback = !bio.image || imageError;

  const rgba = (c, a) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
  const adjust = (c, f) => ({ r: Math.max(0, Math.min(255, Math.round(c.r * f))), g: Math.max(0, Math.min(255, Math.round(c.g * f))), b: Math.max(0, Math.min(255, Math.round(c.b * f))) });
  // inline style below

  return (
    <div className={`p-4 rounded-xl shadow border backdrop-blur-md transition-all duration-300 ${
      coverColor ? '' : theme === 'light' ? 'bg-white/90 border-gray-200' : theme === 'medium' ? 'bg-gray-700/90 border-gray-600' : 'bg-gray-800/90 border-gray-700'
    }`} style={coverColor ? { background: `linear-gradient(135deg, ${rgba(coverColor, theme === 'light' ? 0.85 : 0.7)} 0%, ${rgba(adjust(coverColor, 0.65), theme === 'light' ? 0.95 : 0.85)} 100%)` } : undefined}>
      <div className="flex items-start gap-3">
        {showFallback ? (
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${theme === 'light' ? 'border-gray-300 bg-gray-200 text-gray-600' : 'border-gray-700 bg-gray-700 text-gray-400'}`}>
            <Music size={22} />
          </div>
        ) : (
          <img
            src={bio.image}
            alt={bio.name}
            className={`w-14 h-14 rounded-full object-cover border ${theme === 'light' ? 'border-gray-300' : 'border-gray-700'}`}
            onError={() => setImageError(true)}
          />
        )}
        <div className="flex-1">
          <h4 className={`text-base font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>{bio.name}</h4>
          <p className={`text-sm mt-1 leading-relaxed ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}
             dangerouslySetInnerHTML={{ __html: bio.bio }} />
        </div>
      </div>
    </div>
  );
}
