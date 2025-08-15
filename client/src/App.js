import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Stats from './pages/Stats';
import Header from './components/Header';
import DarkVeil from './components/DarkVeil';
import './App.css';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App" style={{ minHeight: '100vh', position: 'relative' }}>
          {/* DarkVeil as background, not fixed */}
          <DarkVeil />
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/stats" element={<Stats />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
