import React from 'react';

const TestComponent = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'red',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
      zIndex: 99999,
      fontSize: '24px',
      fontWeight: 'bold'
    }}>
      🔥 TEST COMPONENT IS WORKING - CHANGES ARE BEING DETECTED 🔥
    </div>
  );
};

export default TestComponent;
