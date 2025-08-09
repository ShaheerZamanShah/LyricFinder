import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Header from './components/Header';
// import Home from './pages/Home';
import SpotifyCallback from './components/SpotifyCallback';
// import DarkVeil from './components/DarkVeil';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Simple safe component to test step by step
const SafeHome = () => {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4 text-black">
          🎵 LyricFinder is Loading...
        </h1>
        <p className="text-lg mb-8 text-gray-700">
          Testing component by component to find the issue.
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>✅ React is working!</strong>
          <p className="mt-2">Current theme: {theme}</p>
          <p>Backend URL: {process.env.REACT_APP_API_URL || 'Not set yet'}</p>
        </div>
        
        <div className="text-sm text-gray-600 mt-8">
          <h3 className="font-semibold mb-2">Deployment Status:</h3>
          <p>✅ Frontend: Deployed on Vercel</p>
          <p>✅ Backend: Deployed on Railway</p>
          <p>🔄 Testing: Components step by step</p>
        </div>
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
      <div className="min-h-screen flex flex-col relative transition-colors duration-300">
        {/* Content Layer */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Routes>
            <Route path="/" element={
              <>
                <main className="flex-1 p-5 max-w-6xl mx-auto w-full">
                  <SafeHome />
                </main>
              </>
            } />
            <Route path="/callback" element={<SpotifyCallback />} />
          </Routes>
        </div>
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
