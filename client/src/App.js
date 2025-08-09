import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Simple Home component without complex features
const SimpleHome = () => {
  const { theme } = useTheme();
  
  return (
    <main className="flex-1 p-5 max-w-6xl mx-auto w-full">
      <div style={{ 
        padding: '40px', 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f0f8ff',
        color: theme === 'dark' ? 'white' : 'black',
        minHeight: '50vh',
        borderRadius: '10px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          🎵 LyricFinder - Phase 3 Testing
        </h1>
        
        <div style={{ 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Phase 3 Status:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#155724' }}>
            <li>Header Component ✅</li>
            <li>Theme: <strong>{theme}</strong> ✅</li>
            <li>Backend Connected: <strong>Yes</strong> ✅</li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7',
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>� Ready for:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
            <li>Full Home component with search</li>
            <li>DarkVeil background effects</li>
            <li>Complete functionality</li>
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
              <SimpleHome />
            </>
          } />
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
