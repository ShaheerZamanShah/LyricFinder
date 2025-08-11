import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Music } from 'lucide-react';

export default function SimilarArtists({ artists, coverColor = null }) {
  const { theme } = useTheme();

  if (!artists || artists.length === 0) return null;

  const rgba = (c, a) => 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + a + ')';
  const adjust = (c, f) => ({
    r: Math.max(0, Math.min(255, Math.round(c.r * f))),
    g: Math.max(0, Math.min(255, Math.round(c.g * f))),
    b: Math.max(0, Math.min(255, Math.round(c.b * f)))
  });

  const coverBg = coverColor
    ? {
        background:
          'linear-gradient(135deg, ' +
          rgba(coverColor, theme === 'light' ? 0.85 : 0.7) +
          ' 0%, ' +
          rgba(adjust(coverColor, 0.65), theme === 'light' ? 0.95 : 0.85) +
          ' 100%)'
      }
    : undefined;

  const baseCard =
    'rounded-lg p-3 flex flex-col items-center transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-md border';
  const themeCard = coverColor
    ? ''
    : theme === 'light'
    ? 'bg-white/90 border-gray-200 hover:bg-gray-50/90'
    : theme === 'medium'
    ? 'bg-gray-600/90 border-gray-500 hover:bg-gray-500/90'
    : 'bg-gray-800/90 border-gray-700 hover:bg-gray-700/90';
  const cardClass = baseCard + (themeCard ? ' ' + themeCard : '');

  const fallbackBase = 'w-20 h-20 rounded-full flex items-center justify-center transition-colors';
  const fallbackClass =
    fallbackBase +
    ' ' +
    (theme === 'light' ? 'bg-gray-200 text-gray-500' : 'bg-gray-700 text-gray-500');
  const nameClass =
    'text-sm mt-2 text-center transition-colors ' +
    (theme === 'light' ? 'text-gray-700' : 'text-gray-300');
  const imgBorderClass = theme === 'light' ? 'border-gray-300' : 'border-gray-700';

  function ArtistCard({ artist }) {
    const [imageError, setImageError] = useState(false);

    const isPlaceholderImage = (imageUrl) => {
      if (!imageUrl) return true;
      if (imageUrl.includes('spotify.com') || imageUrl.includes('scdn.co')) return false;
      const placeholderPatterns = [
        '2a96cbd8b46e442fc41c2b86b821562f.png',
        'c6f59c1e5e7240a4c0d427abd71f3dbb.png',
        '4128a6eb29f94943c9d206c08e625904.jpg'
      ];
      return placeholderPatterns.some((pattern) => imageUrl.includes(pattern));
    };

    const showFallback = !artist.image || imageError || isPlaceholderImage(artist.image);

    return (
      <div className={cardClass} style={coverBg}>
        {showFallback ? (
          <div className={fallbackClass}>
            <Music size={24} />
            <span className="sr-only">No image available</span>
          </div>
        ) : (
          <img
            src={artist.image}
            alt={artist.name}
            className={'w-20 h-20 object-cover rounded-full border transition-all duration-300 ' + imgBorderClass}
            onError={function () {
              setImageError(true);
            }}
            onLoad={function () {
              setImageError(false);
            }}
          />
        )}
        <p className={nameClass}>{artist.name}</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className={
        'text-lg font-semibold mb-4 transition-colors ' +
        (theme === 'light' ? 'text-gray-900' : 'text-white')
      }>
        Similar Artists
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {artists.map(function (artist, idx) {
          return <ArtistCard key={idx} artist={artist} />;
        })}
      </div>
    </div>
  );
}
