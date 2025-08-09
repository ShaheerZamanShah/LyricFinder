import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SearchForm = ({ onSearchResults, onCollapseChange }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useTheme();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/lyrics/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        onSearchResults(data);
        setIsCollapsed(true);
        onCollapseChange(true);
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

  const getInputStyles = () => {
    switch (theme) {
      case 'light':
        return 'bg-white/90 border-blue-200 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:ring-blue-300';
      case 'medium':
        return 'bg-gray-800/90 border-purple-400 text-white placeholder-gray-300 focus:border-purple-300 focus:ring-purple-400';
      case 'dark':
        return 'bg-gray-900/90 border-red-400 text-white placeholder-gray-400 focus:border-red-300 focus:ring-red-400';
      default:
        return 'bg-white/90 border-blue-200 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:ring-blue-300';
    }
  };

  const getButtonStyles = () => {
    switch (theme) {
      case 'light':
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300';
      case 'medium':
        return 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-400';
      case 'dark':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-400';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300';
    }
  };

  return (
    <div className={`transition-all duration-500 ${isCollapsed ? 'scale-90' : 'scale-100'}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for song lyrics..."
            className={`w-full pl-12 pr-4 py-4 text-lg rounded-xl border-2 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${getInputStyles()}`}
            disabled={isLoading}
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`mt-4 w-full py-3 text-white font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed ${getButtonStyles()}`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={20} />
              <span>Searching...</span>
            </div>
          ) : (
            'Search Lyrics'
          )}
        </button>
      </form>
    </div>
  );
};

export default SearchForm;
