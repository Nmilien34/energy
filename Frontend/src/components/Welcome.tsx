import React, { useEffect, useState } from 'react';

const Welcome: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<string>('');
  const apiUrl = process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_PROD_API_URL 
    : process.env.REACT_APP_API_URL;

  useEffect(() => {
    console.log('Welcome component mounted');
    console.log('Using API URL:', apiUrl); // Debug log
    // Test backend connection
    fetch(apiUrl || 'http://localhost:5003')
      .then(res => {
        console.log('Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('Backend response:', data);
        setServerStatus(data.message);
      })
      .catch(err => {
        console.error('Backend error:', err);
        setServerStatus('Error connecting to server');
      });
  }, [apiUrl]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '2.5rem',
      fontWeight: 'bold',
      textAlign: 'center',
      padding: '20px',
      background: '#f5f5f5'
    }}>
      <div>Welcome to your one stop shop for all music</div>
      {serverStatus && (
        <div style={{ fontSize: '1rem', marginTop: '20px', color: '#666' }}>
          Server Status: {serverStatus}
        </div>
      )}
    </div>
  );
};

export default Welcome; 