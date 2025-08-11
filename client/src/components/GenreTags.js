import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function GenreTags({ tags, compact = false }) {
  const { theme } = useTheme();
  
  if (!tags || tags.length === 0) return null;
  
  return (
    <div className={compact ? 'mt-2' : 'mt-6'}>
      <h3 className={`text-lg font-semibold mb-2 transition-colors ${
        theme === 'light' ? 'text-gray-900' : 'text-white'
      }`}>
        Genres
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className={`px-3 py-1 rounded-full text-sm transition-all duration-300 hover:scale-105 cursor-pointer ${
              theme === 'light'
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : theme === 'medium'
                ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
