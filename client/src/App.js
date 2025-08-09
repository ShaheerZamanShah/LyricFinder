import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Test component with ThemeContext
const TestHome = () => {
  const { theme, toggleTheme } = useTheme();
  
  const getBackgroundGradient = () => {
    switch (theme) {
      case 'light': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'medium': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'dark': return 'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };
  
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      background: getBackgroundGradient(),
      minHeight: '100vh',
      color: 'white',
      transition: 'all 0.3s ease'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
        🎵 LyricFinder - Phase 2 Test
      </h1>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button 
          onClick={toggleTheme}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          🎨 Switch Theme (Current: {theme})
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h3>✅ Phase 2 Status:</h3>
        <ul style={{ marginLeft: '20px' }}>
          <li>✅ React rendering</li>
          <li>✅ ThemeContext working (fixed localStorage)</li>
          <li>✅ React Router working</li>
          <li>✅ Theme switching: <strong>{theme}</strong></li>
          <li>✅ Dynamic styling</li>
        </ul>
      </div>

      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px' 
      }}>
        <h3>🎯 Next: Phase 3</h3>
        <p>Add Header component and basic layout structure</p>
      </div>
    </div>
  );
};

const AppContent = () => {
  return (
    <Router>
      <div className="min-h-screen transition-colors duration-300">
        <Routes>
          <Route path="/" element={<TestHome />} />
        </Routes>
      </div>
    </Router>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
