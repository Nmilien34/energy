/**
 * Test script to debug playlist creation
 * Run this with: node test-playlist-creation.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testPlaylistCreation() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/energy');
    console.log('✓ MongoDB connected');

    // Import models
    const Playlist = require('./dist/models/Playlist').Playlist;
    const User = require('./dist/models/User').User;

    // Find a user (or create test user)
    let testUser = await User.findOne();
    if (!testUser) {
      console.log('No users found. Creating test user...');
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword'
      });
      await testUser.save();
      console.log('✓ Test user created');
    } else {
      console.log('✓ Found existing user:', testUser.email);
    }

    // Try to create a playlist
    console.log('\nTrying to create playlist...');
    const testPlaylist = new Playlist({
      name: 'Test Playlist ' + Date.now(),
      description: 'This is a test playlist',
      owner: testUser._id,
      isPublic: false,
      isCollaborative: false,
      songs: [],
      collaborators: [],
      followers: [],
      tags: []
    });

    await testPlaylist.save();
    console.log('✓ Playlist created successfully!');
    console.log('Playlist ID:', testPlaylist._id);
    console.log('Playlist name:', testPlaylist.name);

    // Verify it was saved
    const savedPlaylist = await Playlist.findById(testPlaylist._id);
    if (savedPlaylist) {
      console.log('✓ Playlist verified in database');
    }

    // Clean up test playlist
    await Playlist.findByIdAndDelete(testPlaylist._id);
    console.log('✓ Test playlist cleaned up');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPlaylistCreation();
