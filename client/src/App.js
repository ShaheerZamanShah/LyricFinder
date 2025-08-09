import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Header from './components/Header';
import SpotifyCallback from './components/SpotifyCallback';
import { ThemeProvider } from './contexts/ThemeContext';

// Simple background component without WebGL
const SimpleBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-green-900/20" />
  );
};

const AppContent = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col relative transition-colors duration-300">
        <SimpleBackground />
        <Routes>
          <Route path="/" element={
            <>
              <Header />
              <Home />
            </>
          } />
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
