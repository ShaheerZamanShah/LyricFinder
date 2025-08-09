import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Test component with Header
const TestHome = () => {
  const { theme } = useTheme();
  
  return (
    <main className="flex-1 p-5 max-w-6xl mx-auto w-full">
      <div style={{ 
        padding: '40px', 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: theme === 'dark' ? '#1a1a1a' : theme === 'medium' ? '#2d3748' : '#f0f8ff',
        color: theme === 'dark' ? 'white' : theme === 'medium' ? 'white' : 'black',
        minHeight: '60vh',
        borderRadius: '10px',
        border: theme === 'light' ? '1px solid #e2e8f0' : 'none'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          🎵 LyricFinder - Phase 3 Test
        </h1>
        
        <div style={{ 
          backgroundColor: theme === 'dark' ? '#2d3748' : theme === 'medium' ? '#4a5568' : '#e6fffa', 
          border: `1px solid ${theme === 'dark' ? '#4a5568' : theme === 'medium' ? '#63b3ed' : '#81e6d9'}`,
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: theme === 'dark' ? '#68d391' : theme === 'medium' ? '#90cdf4' : '#2d3748' }}>
            ✅ Phase 3 Status:
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: theme === 'dark' ? '#a0aec0' : theme === 'medium' ? '#e2e8f0' : '#4a5568' }}>
            <li>✅ Header Component working</li>
            <li>✅ Theme: <strong>{theme}</strong></li>
            <li>✅ Responsive layout</li>
            <li>✅ Navigation structure</li>
            <li>✅ Theme-aware styling</li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: theme === 'dark' ? '#2a4365' : theme === 'medium' ? '#553c9a' : '#fef5e7', 
          border: `1px solid ${theme === 'dark' ? '#3182ce' : theme === 'medium' ? '#805ad5' : '#f6ad55'}`,
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: theme === 'dark' ? '#90cdf4' : theme === 'medium' ? '#d6bcfa' : '#c53030' }}>
            🎯 Next: Phase 4
          </h3>
          <p style={{ margin: 0, color: theme === 'dark' ? '#a0aec0' : theme === 'medium' ? '#e2e8f0' : '#744210' }}>
            Add the complete Home component with search functionality
          </p>
        </div>

        <div style={{ 
          backgroundColor: theme === 'dark' ? '#1a365d' : theme === 'medium' ? '#44337a' : '#f0fff4', 
          border: `1px solid ${theme === 'dark' ? '#2b6cb0' : theme === 'medium' ? '#6b46c1' : '#9ae6b4'}`,
          padding: '15px', 
          borderRadius: '5px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: theme === 'dark' ? '#63b3ed' : theme === 'medium' ? '#c4b5fd' : '#22543d' }}>
            📊 Environment Info:
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: theme === 'dark' ? '#a0aec0' : theme === 'medium' ? '#e2e8f0' : '#276749' }}>
            <li><strong>API URL:</strong> {process.env.REACT_APP_API_URL || 'Not set'}</li>
            <li><strong>Theme:</strong> {theme}</li>
            <li><strong>Header:</strong> Active with theme switching</li>
          </ul>
        </div>
      </div>
    </main>
  );
};

const AppContent = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col relative transition-colors duration-300">
        <Routes>
          <Route path="/" element={
            <>
              <Header />
              <TestHome />
            </>
          } />
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
