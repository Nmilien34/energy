/**
 * Test the add song to playlist route
 * Run with: node test-add-song-route.js
 */

const axios = require('axios');

async function testAddSongRoute() {
  try {
    console.log('Testing POST /api/playlists/:id/songs route\n');

    // Use one of your existing playlists
    const playlistId = '68ebfd251b24ee5f544499a7';
    const songId = 'dQw4w9WgXcQ'; // Test YouTube ID

    console.log(`Playlist ID: ${playlistId}`);
    console.log(`Song ID: ${songId}`);
    console.log(`URL: http://localhost:5003/api/playlists/${playlistId}/songs`);
    console.log('');

    // First, check if the route responds at all (without auth)
    console.log('1. Testing route accessibility (should get 401 or similar)...');
    try {
      const response = await axios.post(
        `http://localhost:5003/api/playlists/${playlistId}/songs`,
        { songId },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      console.log('Status:', response.status);
      console.log('Response:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Response:', error.response.data);

        if (error.response.status === 401) {
          console.log('✓ Route exists! Got 401 Unauthorized (expected without token)');
        } else if (error.response.status === 404) {
          console.log('✗ Route not found! Got 404');
        }
      } else {
        console.log('✗ Error:', error.message);
      }
    }

    console.log('\n2. Checking all registered routes...');
    console.log('Attempting to hit /api/playlists/user to verify routes are loaded...');
    try {
      await axios.get('http://localhost:5003/api/playlists/user');
    } catch (error) {
      if (error.response) {
        console.log('Status:', error.response.status);
        if (error.response.status === 401) {
          console.log('✓ Routes are loaded! Got 401 for /user endpoint');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAddSongRoute();
