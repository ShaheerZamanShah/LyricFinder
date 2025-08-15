import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Moon, Sun, Sunset, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Header = ({ isSearchCollapsed, onCollapseChange }) => {
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
    <header className="bg-black/20 backdrop-blur-md border-b border-white/20 px-4 md:px-6 py-4 shadow-lg sticky top-0 z-30">
  <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-white text-2xl font-bold no-underline drop-shadow-lg px-3 border-x border-white/15 hover:bg-white/10 rounded-md transition-colors"
            title="Home"
          >
            <Music size={32} />
            LyricFinder
          </Link>

          {/* Search icon appears when the main search is collapsed */}
          {isSearchCollapsed && (
            <button
              onClick={() => onCollapseChange?.(false)}
              className="ml-3 flex items-center justify-center w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all"
              aria-label="Open search"
              title="Open search"
            >
              <Search size={18} />
            </button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-white/80 hover:text-white transition-colors duration-200"
              aria-label="Go to Home page"
              title="Home"
            >
              Home
            </Link>
            <Link
                to="/stats"
                className="text-white/80 hover:text-white transition-colors duration-200"
                aria-label="Go to Stats page"
                title="Stats"
              >
                Stats
            </Link>
          </nav>
          <button
            onClick={toggleTheme}
            className="flex items-center gap bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-lg text-white transition-all duration-200"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {getThemeIcon()}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
