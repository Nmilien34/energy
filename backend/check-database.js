/**
 * Script to check what's actually in the database
 * Run with: node check-database.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('=== DATABASE INSPECTION ===\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/energy');
    console.log('✓ Connected\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📦 Collections in database:');
    collections.forEach(col => {
      console.log('  -', col.name);
    });
    console.log('');

    // Load models
    const { User, Playlist, Song, UserLibrary } = require('./dist/models/index');

    // Check Users
    console.log('👥 USERS:');
    const users = await User.find({}).select('email username createdAt lastLogin');
    console.log(`Found ${users.length} users\n`);
    users.forEach((user, i) => {
      console.log(`  User ${i + 1}:`);
      console.log(`    ID: ${user._id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Username: ${user.username}`);
      console.log(`    Created: ${user.createdAt}`);
      console.log(`    Last Login: ${user.lastLogin || 'Never'}`);
      console.log('');
    });

    // Check Playlists
    console.log('🎵 PLAYLISTS:');
    const playlists = await Playlist.find({}).select('name owner songs createdAt');
    console.log(`Found ${playlists.length} playlists\n`);
    if (playlists.length > 0) {
      playlists.slice(0, 5).forEach((playlist, i) => {
        console.log(`  Playlist ${i + 1}:`);
        console.log(`    ID: ${playlist._id}`);
        console.log(`    Name: ${playlist.name}`);
        console.log(`    Owner: ${playlist.owner}`);
        console.log(`    Songs: ${playlist.songs.length}`);
        console.log(`    Created: ${playlist.createdAt}`);
        console.log('');
      });
      if (playlists.length > 5) {
        console.log(`  ... and ${playlists.length - 5} more playlists\n`);
      }
    }

    // Check Songs
    console.log('🎼 SONGS:');
    const songs = await Song.find({}).select('title artist youtubeId playCount createdAt');
    console.log(`Found ${songs.length} songs\n`);
    if (songs.length > 0) {
      songs.slice(0, 5).forEach((song, i) => {
        console.log(`  Song ${i + 1}:`);
        console.log(`    ID: ${song._id}`);
        console.log(`    Title: ${song.title}`);
        console.log(`    Artist: ${song.artist}`);
        console.log(`    YouTube ID: ${song.youtubeId}`);
        console.log(`    Play Count: ${song.playCount}`);
        console.log(`    Created: ${song.createdAt}`);
        console.log('');
      });
      if (songs.length > 5) {
        console.log(`  ... and ${songs.length - 5} more songs\n`);
      }
    }

    // Check UserLibrary
    console.log('📚 USER LIBRARIES:');
    const libraries = await UserLibrary.find({}).select('user favorites recentlyPlayed');
    console.log(`Found ${libraries.length} user libraries\n`);
    libraries.forEach((lib, i) => {
      console.log(`  Library ${i + 1}:`);
      console.log(`    User ID: ${lib.user}`);
      console.log(`    Favorites: ${lib.favorites?.length || 0} songs`);
      console.log(`    Recent: ${lib.recentlyPlayed?.length || 0} songs`);
      console.log('');
    });

    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Playlists: ${playlists.length}`);
    console.log(`Total Songs: ${songs.length}`);
    console.log(`Total Libraries: ${libraries.length}`);

    // Check for any TTL indexes (auto-delete)
    console.log('\n=== CHECKING FOR AUTO-DELETE INDEXES (TTL) ===');
    for (const collection of collections) {
      const indexes = await mongoose.connection.db.collection(collection.name).indexes();
      const ttlIndexes = indexes.filter(idx => idx.expireAfterSeconds !== undefined);
      if (ttlIndexes.length > 0) {
        console.log(`⚠️  Collection "${collection.name}" has TTL indexes (auto-delete):`);
        ttlIndexes.forEach(idx => {
          console.log(`   - ${JSON.stringify(idx.key)} expires after ${idx.expireAfterSeconds} seconds`);
        });
      }
    }
    console.log('✓ No TTL indexes found - data should persist');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
