import React from 'react';
import { Music, Play } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SearchSuggestions = ({ suggestions, onSuggestionClick, loading }) => {
  const { theme } = useTheme();
  if (loading) {
    return (
      <div className={`absolute top-full left-0 right-0 backdrop-blur-md rounded-xl mt-2 p-4 shadow-lg border z-50 ${
        theme === 'dark' 
          ? 'bg-gray-900/95 border-gray-600/30 text-gray-300' 
          : theme === 'medium'
          ? 'bg-gray-800/95 border-gray-400/30 text-gray-200'
          : 'bg-white/95 border-white/20 text-gray-600'
      }`}>
        <div className="flex items-center justify-center gap-2">
          <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
            theme === 'dark' || theme === 'medium' ? 'border-gray-400' : 'border-gray-400'
          }`}></div>
          Searching...
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`absolute top-full left-0 right-0 backdrop-blur-md rounded-xl mt-2 shadow-lg border z-50 max-h-96 overflow-y-auto ${
      theme === 'dark' 
        ? 'bg-gray-900/95 border-gray-600/30' 
        : theme === 'medium'
        ? 'bg-gray-800/95 border-gray-400/30'
        : 'bg-white/95 border-white/20'
    }`}>
      {suggestions.map((track, index) => (
        <div
          key={track.id || index}
          onClick={() => onSuggestionClick(track)}
          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
            theme === 'dark'
              ? 'hover:bg-gray-700/50 border-gray-600/20'
              : theme === 'medium'
              ? 'hover:bg-gray-600/30 border-gray-500/20'
              : 'hover:bg-white/20 border-white/10'
          }`}
        >
          {/* Album Cover */}
          <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${
            theme === 'dark' || theme === 'medium' ? 'bg-gray-600' : 'bg-gray-200'
          }`}>
            {track.image ? (
              <img 
                src={track.image} 
                alt={`${track.title} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
                <Music className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="flex-1 min-w-0">
            <div className={`font-semibold truncate ${
              theme === 'dark' 
                ? 'text-gray-100' 
                : theme === 'medium'
                ? 'text-gray-200'
                : 'text-gray-800'
            }`}>{track.title}</div>
            <div className={`text-sm truncate ${
              theme === 'dark' 
                ? 'text-gray-300' 
                : theme === 'medium'
                ? 'text-gray-300'
                : 'text-gray-600'
            }`}>{track.artist}</div>
            {track.album && (
              <div className={`text-xs truncate ${
                theme === 'dark' 
                  ? 'text-gray-400' 
                  : theme === 'medium'
                  ? 'text-gray-400'
                  : 'text-gray-500'
              }`}>{track.album}</div>
            )}
          </div>

          {/* Preview Button */}
          {track.preview_url && (
            <div className="flex-shrink-0">
              <Play className={`w-5 h-5 ${
                theme === 'dark' || theme === 'medium' ? 'text-gray-400' : 'text-gray-500'
              }`} />
            </div>
          )}

          {/* Spotify Logo */}
          <div className="flex-shrink-0 text-green-500">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchSuggestions;
