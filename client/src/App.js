import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Header from './components/Header';
import DarkVeil from './components/DarkVeil';
import SpotifyCallback from './components/SpotifyCallback';
import { ThemeProvider } from './contexts/ThemeContext';

const AppContent = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col relative transition-colors duration-300">
        <DarkVeil />
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

export default App;
