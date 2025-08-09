import React, { useState, useEffect } from 'react';
import SearchForm from '../components/SearchForm';
import ArtistSection from '../components/ArtistSection';
import { Music, Play, Pause, ExternalLink } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import useSpotify from '../hooks/useSpotify';
import { API_ENDPOINTS } from '../config/api';

// Simple test component to verify React is working
const TestHome = () => {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">
          🎵 LyricFinder Test Page
        </h1>
        <p className="text-lg mb-8">
          Frontend is working! Backend connection needed.
        </p>
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <strong>Next Steps:</strong>
          <ol className="text-left mt-2">
            <li>1. Get your Railway backend URL</li>
            <li>2. Add REACT_APP_API_URL environment variable in Vercel</li>
            <li>3. Redeploy to connect frontend to backend</li>
          </ol>
        </div>
        <div className="text-sm text-gray-600">
          <p>Current API URL: {process.env.REACT_APP_API_URL || 'Not set'}</p>
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>Theme: {theme}</p>
        </div>
      </div>
    </div>
  );
};

export default TestHome;
