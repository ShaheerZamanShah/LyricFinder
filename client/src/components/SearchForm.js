/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { API_ENDPOINTS } from '../config/api';

const SearchForm = ({ onSearchResults, onCollapseChange = () => {}, isHeaderSearch = false }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Removed unused collapsed state (parent controls collapse)
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // Removed unused minimized state (UI no longer depends on it)
  const { theme } = useTheme();
  const searchTimeoutRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formRef.current && !formRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Search suggestions as user types using server-side Spotify search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length >= 2) {
      setShowSuggestions(true);
      
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // Use server-side Spotify search with your secret
          const response = await fetch(`${API_ENDPOINTS.SPOTIFY_SEARCH}?q=${encodeURIComponent(query.trim())}&limit=8`);
          if (response.ok) {
            const data = await response.json();
            setSuggestions(data.tracks || []);
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error('Suggestions error:', error);
          setSuggestions([]);
        }
      }, 300);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Always close suggestions when searching
    setShowSuggestions(false);

    // If there are suggestions and user presses Enter, use the first suggestion
    if (suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      console.log('Using first suggestion:', firstSuggestion);
      await handleSuggestionClick(firstSuggestion);
      return;
    }

    setIsLoading(true);
    
    try {
      // Parse query to extract title and artist
      const queryTrim = query.trim();
      let title, artist;
      
      // Try to split by common separators
      if (queryTrim.includes(' - ')) {
        [artist, title] = queryTrim.split(' - ').map(s => s.trim());
      } else if (queryTrim.includes(' by ')) {
        [title, artist] = queryTrim.split(' by ').map(s => s.trim());
      } else {
        // Assume it's just a title and let server handle it
        title = queryTrim;
        artist = '';
      }

      const response = await fetch(API_ENDPOINTS.SEARCH_LYRICS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: title || queryTrim,
          artist: artist || '',
          query: queryTrim 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSearchResults(data);
        if (!isHeaderSearch) {
          onCollapseChange(true);
        }
      } else {
        console.error('Search failed');
        onSearchResults(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      onSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (track) => {
    console.log('Suggestion clicked:', track);
    setQuery(`${track.title} - ${track.artist}`);
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.SEARCH_LYRICS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: track.title,
          artist: track.artist,
          query: `${track.title} ${track.artist}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSearchResults(data);
        if (!isHeaderSearch) {
          onCollapseChange(true);
        }
      } else {
        console.error('Search failed');
        onSearchResults(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      onSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Removed unused expandSearch helper

  // Removed unused getInputStyles helper

  const getSearchButtonStyles = () => {
    if (!query.trim()) {
      return 'bg-gray-200 text-gray-400 cursor-not-allowed';
    }
    
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700';
      case 'medium':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-purple-600 hover:to-purple-700';
      case 'dark':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700';
    }
  };

  const getIconColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-400';
      case 'medium':
        return 'text-gray-400';
      case 'dark':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  // Different container styles for header vs main search
  const getContainerStyles = () => {
    if (isHeaderSearch) {
      return 'w-64'; // Smaller width for header search
    }
    
    // Keep search bar at original size always - no scaling
    return `max-w-2xl w-full mx-auto px-4 transition-all duration-700 ease-out`;
  };

  // Different form styles for header vs main search
  const getFormStyles = () => {
    if (isHeaderSearch) {
      return 'w-full';
    }
    return 'relative';
  };

  return (
    <div className={getContainerStyles()} ref={formRef}>
      <form onSubmit={handleSearch} className={getFormStyles()}>
        <div className={`relative flex items-center transition-all duration-300 ${
          isFocused ? 'ring-2' : 'ring-1'
        } ${
          theme === 'light' 
            ? `${isFocused ? 'ring-blue-500' : 'ring-gray-300'} bg-white/95` 
            : theme === 'medium'
            ? `${isFocused ? 'ring-purple-400' : 'ring-gray-600'} bg-gray-800/95`
            : `${isFocused ? 'ring-red-400' : 'ring-gray-700'} bg-gray-900/95`
        } rounded-full shadow-lg overflow-hidden hover:shadow-xl backdrop-blur-xl`}>
          
          {/* Search icon */}
          <div className={`absolute ${isHeaderSearch ? 'left-3' : 'left-4'} flex items-center pointer-events-none`}>
            <Search className={`${isHeaderSearch ? 'h-4 w-4' : 'h-5 w-5'} ${getIconColor()}`} />
          </div>
          
          {/* Clear button (X) */}
          {query && !isLoading && (
            <button
              type="button"
              onClick={clearSearch}
              className={`absolute ${isHeaderSearch ? 'right-12' : 'right-20'} p-1 rounded-full transition-colors ${
                theme === 'light' 
                  ? 'hover:bg-gray-100' 
                  : 'hover:bg-gray-700'
              }`}
              aria-label="Clear search"
            >
              <X className={`${isHeaderSearch ? 'h-3 w-3' : 'h-4 w-4'} text-gray-500`} />
            </button>
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className={`absolute ${isHeaderSearch ? 'right-12' : 'right-20'} flex items-center`}>
              <Loader2 className={`animate-spin ${isHeaderSearch ? 'h-3 w-3' : 'h-4 w-4'} ${
                theme === 'light' ? 'text-blue-500' : theme === 'medium' ? 'text-purple-400' : 'text-red-400'
              }`} />
            </div>
          )}
          
          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (query.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={isHeaderSearch ? "Search..." : "Search for songs, artists, or lyrics..."}
            className={`w-full ${isHeaderSearch ? 'py-2 pl-10 pr-20' : 'py-4 pl-12 pr-32'} focus:outline-none bg-transparent ${
              theme === 'light' ? 'text-gray-800 placeholder-gray-500' : 'text-white placeholder-gray-400'
            }`}
            disabled={isLoading}
            aria-label="Search for lyrics"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && suggestions.length > 0) {
                e.preventDefault();
                // Focus first suggestion (we can add keyboard navigation later)
              }
            }}
          />
          
          {/* Search button */}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={`absolute right-1 ${isHeaderSearch ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} rounded-full font-medium transition-all duration-300 ${getSearchButtonStyles()}`}
          >
            {isHeaderSearch ? '🔍' : 'Search'}
          </button>
        </div>
        
        {/* Search Suggestions - Normal flow to push content down */}
        {showSuggestions && suggestions.length > 0 && (
          <div className={`backdrop-blur-2xl rounded-3xl mt-4 shadow-2xl border overflow-hidden ${
            theme === 'dark' 
              ? 'bg-black/95 border-red-500/40' 
              : theme === 'medium'
              ? 'bg-gray-900/95 border-purple-500/40'
              : 'bg-white/95 border-blue-500/40'
          }`}>
            <div className="max-h-96 overflow-y-auto">
              {suggestions.slice(0, 6).map((track, index) => (
                <div
                  key={track.id || index}
                  onClick={() => handleSuggestionClick(track)}
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-all duration-300 border-b last:border-b-0 hover:scale-[1.02] ${
                    theme === 'dark' 
                      ? 'hover:bg-red-500/15 border-red-500/20 text-red-100' 
                      : theme === 'medium'
                      ? 'hover:bg-purple-500/15 border-purple-500/20 text-purple-100'
                      : 'hover:bg-blue-500/15 border-blue-500/20 text-blue-900'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg border border-white/20">
                    <img
                      src={track.image || track.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjI0IiB5PSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg=='} 
                      alt={`${track.title} cover`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjI0IiB5PSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsIj7imaE8L3RleHQ+Cjwvc3ZnPg==';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base truncate">
                      {track.title}
                    </div>
                    <div className="text-sm truncate opacity-75">
                      by {track.artist}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </form>
    </div>
  );
};

export default SearchForm;
