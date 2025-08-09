import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Simple working component with ThemeContext
const SimpleHome = () => {
  const { theme } = useTheme();
  
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f0f8ff',
      color: theme === 'dark' ? 'white' : 'black',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: theme === 'dark' ? '#2d2d2d' : 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          🎵 LyricFinder - Phase 2 Testing
        </h1>
        
        <div style={{ 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Now Working:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#155724' }}>
            <li>React Router ✅</li>
            <li>ThemeContext (Fixed localStorage issue) ✅</li>
            <li>Current theme: <strong>{theme}</strong></li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7',
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>🔧 Environment Info:</h3>
          <p style={{ margin: '5px 0', color: '#856404' }}>
            <strong>Backend URL:</strong> {process.env.REACT_APP_API_URL || 'Not set'}
          </p>
          <p style={{ margin: '5px 0', color: '#856404' }}>
            <strong>Environment:</strong> {process.env.NODE_ENV}
          </p>
        </div>

        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔄 Test Refresh
        </button>
      </div>
    </div>
  );
};

const AppContent = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimpleHome />} />
      </Routes>
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
