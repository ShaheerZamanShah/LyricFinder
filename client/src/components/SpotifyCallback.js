import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DarkVeil from './DarkVeil';
import { useTheme } from '../contexts/ThemeContext';

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const getDarkVeilProps = () => {
    switch (theme) {
      case 'light':
        return {
          hueShift: 180,
          noiseIntensity: 0.02,
          scanlineIntensity: 0.1,
          speed: 0.3,
          scanlineFrequency: 0.5,
          warpAmount: 0.1,
        };
      case 'medium':
        return {
          hueShift: 270,
          noiseIntensity: 0.05,
          scanlineIntensity: 0.15,
          speed: 0.5,
          scanlineFrequency: 1.0,
          warpAmount: 0.2,
        };
      case 'dark':
        return {
          hueShift: 0,
          noiseIntensity: 0.08,
          scanlineIntensity: 0.2,
          speed: 0.7,
          scanlineFrequency: 1.5,
          warpAmount: 0.3,
        };
      default:
        return {
          hueShift: 180,
          noiseIntensity: 0.02,
          scanlineIntensity: 0.1,
          speed: 0.3,
          scanlineFrequency: 0.5,
          warpAmount: 0.1,
        };
    }
  };

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
      {/* Iridescence Background */}
      <div className="fixed inset-0 z-0">
        <DarkVeil {...getDarkVeilProps()} />
      </div>
      
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
