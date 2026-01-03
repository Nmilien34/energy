/**
 * Script to find and fix songs with corrupt YouTube IDs
 *
 * The problem: Some songs have MongoDB-style IDs (24 hex chars) stored
 * in the youtubeId field instead of real YouTube video IDs (~11 chars)
 *
 * Run with: npx ts-node src/scripts/fixCorruptYoutubeIds.ts
 */

import dotenv from 'dotenv';
dotenv.config(); // Load .env file BEFORE importing config

import mongoose from 'mongoose';
import { Song, isValidYouTubeId, looksLikeMongoId } from '../models/Song';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/energy';

// Validation functions are now imported from Song model for consistency

async function findCorruptSongs() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Find all songs
    const allSongs = await Song.find({}).select('_id youtubeId title artist').lean();
    console.log(`Total songs in database: ${allSongs.length}\n`);

    const corruptSongs: any[] = [];
    const validSongs: any[] = [];

    for (const song of allSongs) {
      if (!song.youtubeId) {
        corruptSongs.push({ ...song, issue: 'Missing youtubeId' });
      } else if (looksLikeMongoId(song.youtubeId)) {
        corruptSongs.push({ ...song, issue: 'youtubeId looks like MongoDB ObjectId' });
      } else if (!isValidYouTubeId(song.youtubeId)) {
        corruptSongs.push({ ...song, issue: 'youtubeId format is invalid' });
      } else {
        validSongs.push(song);
      }
    }

    console.log('='.repeat(60));
    console.log(`VALID SONGS: ${validSongs.length}`);
    console.log(`CORRUPT SONGS: ${corruptSongs.length}`);
    console.log('='.repeat(60));

    if (corruptSongs.length > 0) {
      console.log('\nCorrupt songs found:\n');
      for (const song of corruptSongs) {
        console.log(`  ID: ${song._id}`);
        console.log(`  Title: ${song.title}`);
        console.log(`  Artist: ${song.artist}`);
        console.log(`  Stored youtubeId: ${song.youtubeId}`);
        console.log(`  Issue: ${song.issue}`);
        console.log('  ---');
      }

      console.log('\nTo fix these songs, you can either:');
      console.log('1. Delete them and re-search/re-import from YouTube');
      console.log('2. Manually update the youtubeId field with the correct YouTube video ID');
      console.log('\nTo DELETE all corrupt songs, run this script with --delete flag');
    } else {
      console.log('\nNo corrupt songs found! All YouTube IDs look valid.');
    }

    // If --delete flag is passed, delete corrupt songs
    if (process.argv.includes('--delete') && corruptSongs.length > 0) {
      console.log('\n*** DELETING CORRUPT SONGS ***');
      const corruptIds = corruptSongs.map(s => s._id);
      const result = await Song.deleteMany({ _id: { $in: corruptIds } });
      console.log(`Deleted ${result.deletedCount} corrupt songs`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

findCorruptSongs();
