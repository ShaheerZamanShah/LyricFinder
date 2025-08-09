import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Music } from 'lucide-react';

export default function ArtistBio({ name, bio, image }) {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  
  console.log('ArtistBio rendering with:', { 
    name, 
    bio: bio?.substring(0, 50), 
    image,
    hasValidImage: !!image
  });
  
  // Check if image is a Last.fm placeholder (keep this for Last.fm images only)
  const isPlaceholderImage = (imageUrl) => {
    if (!imageUrl) return true;
    // Only check for Last.fm placeholders since Spotify images are real
    if (imageUrl.includes('spotify.com') || imageUrl.includes('scdn.co')) return false;
    
    const placeholderPatterns = [
      '2a96cbd8b46e442fc41c2b86b821562f.png',
      'c6f59c1e5e7240a4c0d427abd71f3dbb.png',
      '4128a6eb29f94943c9d206c08e625904.jpg',
    ];
    return placeholderPatterns.some(pattern => imageUrl.includes(pattern));
  };
  
  const showFallback = !image || imageError || isPlaceholderImage(image);
  
  return (
    <div className={`p-6 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 ${
      theme === 'light'
        ? 'bg-white/95 border-gray-200 shadow-gray-300/30'
        : theme === 'medium'
        ? 'bg-gray-700/95 border-gray-600 shadow-black/30'
        : 'bg-gray-800/95 border-gray-700 shadow-black/50'
    }`}>
      <div className="flex items-center space-x-4">
        {showFallback ? (
          <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            theme === 'light' 
              ? 'border-gray-300 bg-gray-200 text-gray-600' 
              : 'border-gray-700 bg-gray-700 text-gray-400'
          }`}>
            <Music size={32} />
            <span className="sr-only">No image available</span>
          </div>
        ) : (
          <img
            src={image}
            alt={name}
            className={`w-24 h-24 rounded-full object-cover border-2 transition-all duration-300 ${
              theme === 'light' 
                ? 'border-gray-300' 
                : 'border-gray-700'
            }`}
            onError={(e) => {
              console.log('ArtistBio: Image failed to load:', image);
              setImageError(true);
            }}
            onLoad={() => {
              console.log('ArtistBio: Image loaded successfully:', image);
              setImageError(false);
            }}
          />
        )}
        <h2 className={`text-3xl font-bold transition-colors ${
          theme === 'light' ? 'text-gray-900' : 'text-white'
        }`}>
          {name}
        </h2>
      </div>
      <div
        className={`mt-4 leading-relaxed transition-colors ${
          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
        }`}
        dangerouslySetInnerHTML={{ __html: bio }}
      />
    </div>
  );
}
