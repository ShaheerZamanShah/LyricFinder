import React from 'react';

// Ultra-minimal test without any dependencies
function App() {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f8ff',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#2c3e50', textAlign: 'center', marginBottom: '20px' }}>
          🎵 LyricFinder - Testing Phase
        </h1>
        
        <div style={{ 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Success Status:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#155724' }}>
            <li>React is loading correctly</li>
            <li>Vercel deployment is working</li>
            <li>No complex components causing crashes</li>
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

        <div style={{ 
          backgroundColor: '#cce7ff', 
          border: '1px solid #b3d9ff',
          padding: '15px', 
          borderRadius: '5px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#004085' }}>🚀 Next Steps:</h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#004085' }}>
            <li>Verify this simple page loads</li>
            <li>Gradually add back components</li>
            <li>Test full functionality</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default App;
