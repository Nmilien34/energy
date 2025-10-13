/**
 * Test script to see what the GET /api/playlists/user endpoint returns
 * Run with: node test-get-playlists.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testGetPlaylists() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/energy');
    console.log('✓ Connected\n');

    // Load all models
    const { Playlist, User, Song } = require('./dist/models/index');

    // Get a user
    const user = await User.findOne();
    if (!user) {
      console.log('No users found');
      process.exit(1);
    }

    console.log(`Finding playlists for user: ${user.email}\n`);

    // Get user's playlists (exactly like the controller does)
    const playlists = await Playlist.find({
      $or: [
        { owner: user._id },
        { collaborators: user._id }
      ]
    })
      .populate('songs', 'youtubeId title artist duration thumbnail')
      .sort({ updatedAt: -1 });

    console.log(`Found ${playlists.length} playlists\n`);

    playlists.forEach((playlist, i) => {
      const json = playlist.toJSON();
      console.log(`Playlist ${i + 1}:`);
      console.log('  ID:', json.id || json._id);
      console.log('  Name:', json.name);
      console.log('  Description:', json.description || '(none)');
      console.log('  Songs:', json.songs.length);
      console.log('  Owner:', json.owner);
      console.log('  Is Public:', json.isPublic);
      console.log('  Created:', json.createdAt);
      console.log('');
    });

    // Show what the API would return
    console.log('\n--- API Response Structure ---');
    const apiResponse = {
      success: true,
      data: playlists.map(p => p.toJSON())
    };
    console.log('Response has "success":', apiResponse.success);
    console.log('Response has "data":', !!apiResponse.data);
    console.log('Data is array:', Array.isArray(apiResponse.data));
    console.log('Array length:', apiResponse.data.length);

    if (apiResponse.data.length > 0) {
      console.log('\nFirst playlist structure:');
      console.log(JSON.stringify(apiResponse.data[0], null, 2).substring(0, 500));
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testGetPlaylists();
