import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Header from './components/Header';
// import Home from './pages/Home';
import SpotifyCallback from './components/SpotifyCallback';
// import DarkVeil from './components/DarkVeil';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Minimal test component
const MinimalHome = () => {
  const { theme } = useTheme();
  
  return (
    <div style={{ padding: '20px', background: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: 'black' }}>🎵 LyricFinder Debug Mode</h1>
      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Environment Check:</h3>
        <p><strong>Theme:</strong> {theme}</p>
        <p><strong>API URL:</strong> {process.env.REACT_APP_API_URL || 'Not set'}</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
      </div>
      <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e8', borderRadius: '8px' }}>
        <h3>Status:</h3>
        <p>✅ React is working</p>
        <p>✅ ThemeContext is working</p>
        <p>✅ Router is working</p>
        <p>🔄 Testing components individually...</p>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { theme } = useTheme();
  
  const getDarkVeilProps = () => {
    switch (theme) {
      case 'light': 
        return {
          hueShift: 180,        // Blue/cyan tones for light mode
          noiseIntensity: 0.02,
          scanlineIntensity: 0.1,
          speed: 0.3,
          scanlineFrequency: 0.5,
          warpAmount: 0.1,
        };
      case 'medium':
        return {
          hueShift: 270,        // Purple tones for medium mode
          noiseIntensity: 0.05,
          scanlineIntensity: 0.15,
          speed: 0.5,
          scanlineFrequency: 1.0,
          warpAmount: 0.2,
        };
      case 'dark':
        return {
          hueShift: 0,          // Original dark tones for dark mode
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
  
  return (
    <Router>
      <div style={{ minHeight: '100vh', background: 'white' }}>
        <Routes>
          <Route path="/" element={<MinimalHome />} />
          <Route path="/callback" element={<SpotifyCallback />} />
        </Routes>
      </div>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
