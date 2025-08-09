import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TestHome from './pages/TestHome';
import SpotifyCallback from './components/SpotifyCallback';
import DarkVeil from './components/DarkVeil';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

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
        {/* DarkVeil Background */}
        <div className="fixed inset-0 z-0">
          <DarkVeil {...getDarkVeilProps()} />
        </div>
      
      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Routes>
          <Route path="/" element={
            <>
              <Header />
              <main className="flex-1 p-5 max-w-6xl mx-auto w-full">
                <TestHome />
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
