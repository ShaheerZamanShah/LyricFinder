import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Music } from 'lucide-react';

export default function SimilarArtists({ artists }) {
  const { theme } = useTheme();
  
  console.log('SimilarArtists rendering with:', artists?.map(a => ({ name: a.name, hasImage: !!a.image, image: a.image })));
  
  if (!artists || artists.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className={`text-lg font-semibold mb-4 transition-colors ${
        theme === 'light' ? 'text-gray-900' : 'text-white'
      }`}>
        Similar Artists
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {artists.map((artist, idx) => {
          const ArtistCard = ({ artist }) => {
            const [imageError, setImageError] = useState(false);
            
            // Check if image is a Last.fm placeholder (keep this for Last.fm images only)
            const isPlaceholderImage = (imageUrl) => {
              if (!imageUrl) return true;
              // Don't filter Spotify images since they're real
              if (imageUrl.includes('spotify.com') || imageUrl.includes('scdn.co')) return false;
              
              const placeholderPatterns = [
                '2a96cbd8b46e442fc41c2b86b821562f.png',
                'c6f59c1e5e7240a4c0d427abd71f3dbb.png',
                '4128a6eb29f94943c9d206c08e625904.jpg',
              ];
              return placeholderPatterns.some(pattern => imageUrl.includes(pattern));
            };
            
            const showFallback = !artist.image || imageError || isPlaceholderImage(artist.image);
            
            return (
              <div
                className={`rounded-lg p-3 flex flex-col items-center transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-md border ${
                  theme === 'light'
                    ? 'bg-white/90 border-gray-200 hover:bg-gray-50/90'
                    : theme === 'medium'
                    ? 'bg-gray-600/90 border-gray-500 hover:bg-gray-500/90'
                    : 'bg-gray-800/90 border-gray-700 hover:bg-gray-700/90'
                }`}
              >
                {showFallback ? (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                    theme === 'light' 
                      ? 'bg-gray-200 text-gray-500' 
                      : 'bg-gray-700 text-gray-500'
                  }`}>
                    <Music size={24} />
                    <span className="sr-only">No image available</span>
                  </div>
                ) : (
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className={`w-20 h-20 object-cover rounded-full border transition-all duration-300 ${
                      theme === 'light' ? 'border-gray-300' : 'border-gray-700'
                    }`}
                    onError={(e) => {
                      console.log('SimilarArtists: Image failed to load for', artist.name, ':', artist.image);
                      setImageError(true);
                    }}
                    onLoad={() => {
                      console.log('SimilarArtists: Image loaded successfully for', artist.name, ':', artist.image);
                      setImageError(false);
                    }}
                  />
                )}
                <p className={`text-sm mt-2 text-center transition-colors ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {artist.name}
                </p>
              </div>
            );
          };
          
          return <ArtistCard key={idx} artist={artist} />;
        })}
      </div>
    </div>
  );
}
