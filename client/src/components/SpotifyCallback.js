import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const getTextColor = () => {
    switch (theme) {
      case 'light': return 'text-gray-900';
      case 'medium': return 'text-gray-100';
      case 'dark': return 'text-white';
      default: return 'text-gray-900';
    }
  };

  const getSpinnerColor = () => {
    switch (theme) {
      case 'light': return 'border-gray-600 border-t-yellow-500';
      case 'medium': return 'border-gray-300 border-t-yellow-400';
      case 'dark': return 'border-gray-300 border-t-yellow-400';
      default: return 'border-gray-600 border-t-yellow-500';
    }
  };

  useEffect(() => {
    // Extract access token from URL hash
    const hash = window.location.hash;
    
    if (hash) {
      const token = hash.substring(1).split("&").find(elem => elem.startsWith("access_token"));
      
      if (token) {
        const accessToken = token.split("=")[1];
        
        // Store token in localStorage
        window.localStorage.setItem("spotify_token", accessToken);
        
        // Clear the hash from URL
        window.location.hash = "";
        
        // Redirect to main page
        navigate('/');
      } else {
        // No token found, redirect to home
        navigate('/');
      }
    } else {
      // No hash, redirect to home
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen relative">
      {/* Simple Background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-green-900/20"></div>
      
      {/* Content */}
      <div className={`relative z-10 text-center transition-colors duration-300 ${getTextColor()}`}>
        <div className={`w-12 h-12 border-3 rounded-full animate-spin mx-auto mb-5 ${getSpinnerColor()}`}></div>
        <h2 className="text-2xl font-bold mb-4">Connecting to Spotify...</h2>
        <p className="text-lg opacity-90">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;
