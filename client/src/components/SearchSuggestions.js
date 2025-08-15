import React from 'react';
import { Music, Play, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SearchSuggestions = ({ suggestions, onSuggestionClick, loading }) => {
  const { theme } = useTheme();
  
  if (loading) {
    return (
      <div className={`absolute top-full left-0 right-0 backdrop-blur-2xl rounded-3xl mt-4 p-8 shadow-2xl border z-50 animate-pulse ${
        theme === 'dark' 
          ? 'bg-black/60 border-red-500/30 text-red-200' 
          : theme === 'medium'
          ? 'bg-gray-900/60 border-purple-500/30 text-purple-200'
          : 'bg-white/60 border-blue-500/30 text-blue-800'
      }`}>
        <div className="flex items-center justify-center gap-4">
          <Loader2 className={`animate-spin ${
            theme === 'dark' ? 'text-red-400' : theme === 'medium' ? 'text-purple-400' : 'text-blue-500'
          }`} size={24} />
          <span className="text-lg font-semibold">Searching for songs...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          container: 'bg-black/70 border-red-500/40 shadow-red-500/20',
          item: 'hover:bg-red-500/15 border-red-500/20 hover:border-red-400/40',
          text: 'text-red-100',
          subtext: 'text-red-300/80',
          accent: 'text-red-400',
          hover: 'group-hover:text-red-300'
        };
      case 'medium':
        return {
          container: 'bg-gray-900/70 border-purple-500/40 shadow-purple-500/20',
          item: 'hover:bg-purple-500/15 border-purple-500/20 hover:border-purple-400/40',
          text: 'text-purple-100',
          subtext: 'text-purple-300/80',
          accent: 'text-purple-400',
          hover: 'group-hover:text-purple-300'
        };
      default:
        return {
          container: 'bg-white/70 border-blue-500/40 shadow-blue-500/20',
          item: 'hover:bg-blue-500/15 border-blue-500/20 hover:border-blue-400/40',
          text: 'text-blue-900',
          subtext: 'text-blue-700/80',
          accent: 'text-blue-600',
          hover: 'group-hover:text-blue-700'
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div className={`absolute top-full left-0 right-0 backdrop-blur-2xl rounded-3xl mt-4 shadow-2xl border z-50 overflow-hidden ${styles.container}`}>
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {suggestions.slice(0, 6).map((track, index) => (
          <div
            key={track.id || index}
            onClick={() => {
              console.log('Suggestion clicked (immediate):', track);
              onSuggestionClick(track);
            }}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevent double-click issues
            }}
            className={`flex items-center gap-5 p-5 cursor-pointer transition-all duration-300 border-b last:border-b-0 group ${styles.item} hover:scale-[1.02] hover:shadow-lg`}
          >
            {/* Album Cover */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg border border-white/20">
                <img
                  src={track.image || track.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjI4IiB5PSIzNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg=='}
                  alt={`${track.title} cover`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjI4IiB5PSIzNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg==';
                  }}
                />
              </div>
              <div className={`absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center`}>
                <Play className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className={`font-bold text-lg truncate ${styles.text} ${styles.hover} transition-colors duration-300`}>
                {track.title}
              </div>
              <div className={`text-base truncate ${styles.subtext} font-medium`}>
                by {track.artist}
              </div>
              {track.album && (
                <div className={`text-sm truncate ${styles.subtext} opacity-75 mt-1`}>
                  Album: {track.album}
                </div>
              )}
            </div>

            {/* Action Icon */}
            <div className={`flex-shrink-0 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110`}>
              <Music className={`w-6 h-6 ${styles.accent}`} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Professional Footer */}
      <div className={`px-6 py-4 text-sm ${styles.subtext} border-t ${styles.item.split(' ')[2]} text-center font-medium`}>
        <div className="flex items-center justify-center gap-2">
          <span>Press</span>
          <kbd className={`px-2 py-1 rounded text-xs font-bold ${
            theme === 'dark' ? 'bg-red-500/20 text-red-300' : 
            theme === 'medium' ? 'bg-purple-500/20 text-purple-300' : 
            'bg-blue-500/20 text-blue-700'
          }`}>Enter</kbd>
          <span>for first result or click any song</span>
        </div>
      </div>
    </div>
  );
};

export default SearchSuggestions;
