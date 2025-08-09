import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Moon, Sun, Sunset } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={20} />;
      case 'medium': return <Sunset size={20} />;
      case 'dark': return <Moon size={20} />;
      default: return <Sun size={20} />;
    }
  };

  

  return (
    <header className="bg-black/20 backdrop-blur-md border-b border-white/20 px-8 py-4 shadow-lg">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-white text-2xl font-bold no-underline drop-shadow-lg">
          <Music size={32} />
          LyricFinder
        </Link>
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-lg text-white transition-all duration-300 hover:scale-105"
          aria-label="Toggle theme"
        >
          {getThemeIcon()}
          <span className="text-sm font-medium">
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
