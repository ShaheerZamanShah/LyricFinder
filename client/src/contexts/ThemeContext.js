import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage for saved preference, default to 'light'
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  useEffect(() => {
    // Save to localStorage whenever theme changes
    localStorage.setItem('theme', theme);

    // Update document class for global styling
    document.documentElement.classList.remove('light', 'medium', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'medium';
      if (prev === 'medium') return 'dark';
      return 'light'; // dark -> light
    });
  };

  // Helper functions for backward compatibility and easier checks
  const isDarkMode = theme === 'dark';
  const isMediumMode = theme === 'medium';
  const isLightMode = theme === 'light';

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isDarkMode,
      isMediumMode,
      isLightMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
};