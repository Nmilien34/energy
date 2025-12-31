/**
 * Best Match Algorithm Service (Musi Algorithm)
 * Implements the "Shadow-Search" algorithm for precise music matching
 */

import { itunesService, iTunesTrack } from './itunesService';
import { youtubeService, YouTubeSearchResult } from './youtubeService';

export interface BestMatchResult extends YouTubeSearchResult {
  matchScore: number;
  durationDelta: number;
  isBestMatch: boolean;
}

interface ScoredResult {
  result: YouTubeSearchResult;
  score: number;
  durationDelta: number;
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns a similarity ratio (0-1, where 1 is identical)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];
  const len1 = s1.length;
  const len2 = s2.length;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Convert YouTube ISO 8601 duration to milliseconds
 * Example: "PT3M20S" -> 200000ms
 */
function parseYouTubeDuration(isoDuration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  
  if (!matches) return 0;

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

/**
 * Check if title contains "dirty keywords" that indicate non-official content
 */
function hasDirtyKeywords(title: string): boolean {
  const dirtyKeywords = [
    'cover',
    'live',
    'reaction',
    'review',
    'guitar hero',
    'nightcore',
    'slowed',
    'sped up',
    'reverb',
    '1 hour',
    '10 hours',
    'extended',
    'mashup',
    'compilation'
  ];

  const lowerTitle = title.toLowerCase();
  return dirtyKeywords.some(keyword => lowerTitle.includes(keyword));
}

/**
 * Check if channel has authority indicators
 */
function hasChannelAuthority(channelTitle: string, artistName: string): boolean {
  const lowerChannel = channelTitle.toLowerCase();
  const lowerArtist = artistName.toLowerCase();
  
  const authorityKeywords = ['topic', 'vevo', 'official'];
  const hasKeyword = authorityKeywords.some(keyword => lowerChannel.includes(keyword));
  const isArtistChannel = lowerChannel.includes(lowerArtist);
  
  return hasKeyword || isArtistChannel;
}

/**
 * Score a YouTube result against the Golden Record
 */
function scoreResult(
  youtubeResult: YouTubeSearchResult,
  goldenRecord: iTunesTrack,
  youtubeDurationMs: number
): { score: number; durationDelta: number } {
  let score = 100; // Start with 100 points
  const goldenDuration = goldenRecord.trackTimeMillis;
  const durationDelta = Math.abs(youtubeDurationMs - goldenDuration);
  const durationDeltaSeconds = durationDelta / 1000;

  // Duration Gate: If difference > 10 seconds, heavily penalize
  if (durationDeltaSeconds > 10) {
    score -= 50; // Heavy penalty for duration mismatch
  } else {
    // Subtle penalty for smaller differences (closer = better)
    score -= durationDeltaSeconds * 2;
  }

  // Title Sanitization: Penalize dirty keywords
  if (hasDirtyKeywords(youtubeResult.title)) {
    score -= 50;
  }

  // Channel Authority: Bonus for official channels
  if (youtubeResult.channelTitle && hasChannelAuthority(youtubeResult.channelTitle, goldenRecord.artistName)) {
    score += 20;
  }

  // Title Similarity: Check Levenshtein distance
  const titleSimilarity = levenshteinSimilarity(
    goldenRecord.trackName,
    youtubeResult.title
  );
  
  if (titleSimilarity < 0.8) {
    score -= 30; // Penalize low similarity
  } else {
    score += titleSimilarity * 10; // Bonus for high similarity
  }

  // Artist Name Match: Check if artist name appears in title or channel
  const artistInTitle = youtubeResult.title.toLowerCase().includes(goldenRecord.artistName.toLowerCase());
  const artistInChannel = youtubeResult.channelTitle?.toLowerCase().includes(goldenRecord.artistName.toLowerCase());
  
  if (artistInTitle || artistInChannel) {
    score += 15;
  }

  return { score: Math.max(0, score), durationDelta: durationDeltaSeconds };
}

class BestMatchService {
  /**
   * Find the best matching YouTube video for a music query
   * Implements the full Musi Algorithm workflow
   */
  async findBestMatch(userQuery: string): Promise<BestMatchResult | null> {
    try {
      // Phase 1: Shadow Request - Get Golden Record from iTunes
      console.log(`🔍 Phase 1: Fetching Golden Record for "${userQuery}"`);
      const goldenRecord = await itunesService.searchTrack(userQuery);

      if (!goldenRecord) {
        console.warn('No Golden Record found, falling back to raw YouTube search');
        return await this.fallbackToRawSearch(userQuery);
      }

      // Phase 2: Precision Query - Construct optimized YouTube search
      const precisionQuery = `"${goldenRecord.artistName}" "${goldenRecord.trackName}" audio`;
      console.log(`🎯 Phase 2: Precision search: "${precisionQuery}"`);

      // Search YouTube with precision query
      const youtubeResults = await youtubeService.searchSongs(precisionQuery, 10);

      if (!youtubeResults || youtubeResults.length === 0) {
        console.warn('No YouTube results, falling back to raw search');
        return await this.fallbackToRawSearch(userQuery);
      }

      // Phase 3: The Sieve - Filter and score results
      console.log(`🔬 Phase 3: Filtering ${youtubeResults.length} results`);
      
      // Get video details for duration (we need to fetch this separately)
      const scoredResults: ScoredResult[] = [];
      
      for (const result of youtubeResults.slice(0, 5)) {
        try {
          // Get video details to extract duration
          const videoDetailsArray = await youtubeService.getVideoDetails(result.id);
          const videoDetails = videoDetailsArray && videoDetailsArray.length > 0 ? videoDetailsArray[0] : null;
          
          if (!videoDetails || !videoDetails.contentDetails?.duration) {
            console.log(`  ⚠️  Skipping: "${result.title}" (no duration available)`);
            continue; // Skip if we can't get duration
          }

          const youtubeDurationMs = parseYouTubeDuration(videoDetails.contentDetails.duration);
          
          // Duration Gate: Discard if difference > 10 seconds
          const goldenDuration = goldenRecord.trackTimeMillis;
          const durationDeltaSeconds = Math.abs(youtubeDurationMs - goldenDuration) / 1000;
          
          if (durationDeltaSeconds > 10) {
            console.log(`  ❌ Discarded: "${result.title}" (duration delta: ${durationDeltaSeconds.toFixed(1)}s)`);
            continue;
          }

          // Score the result
          const { score, durationDelta } = scoreResult(result, goldenRecord, youtubeDurationMs);
          
          scoredResults.push({
            result,
            score,
            durationDelta
          });

          console.log(`  ✓ Scored: "${result.title}" - Score: ${score.toFixed(1)}, Delta: ${durationDelta.toFixed(1)}s`);
        } catch (error) {
          console.warn(`Error processing result "${result.title}":`, error);
          continue;
        }
      }

      if (scoredResults.length === 0) {
        console.warn('No results passed the filter, falling back to raw search');
        return await this.fallbackToRawSearch(userQuery);
      }

      // Sort by score (highest first)
      scoredResults.sort((a, b) => b.score - a.score);

      const bestMatch = scoredResults[0];
      const threshold = 50;

      if (bestMatch.score < threshold) {
        console.warn(`Best match score (${bestMatch.score.toFixed(1)}) below threshold (${threshold}), using fallback`);
        return await this.fallbackToRawSearch(userQuery);
      }

      console.log(`✅ Best Match: "${bestMatch.result.title}" (Score: ${bestMatch.score.toFixed(1)})`);

      return {
        ...bestMatch.result,
        matchScore: bestMatch.score,
        durationDelta: bestMatch.durationDelta,
        isBestMatch: true
      };
    } catch (error: any) {
      console.error('Error in best match algorithm:', error);
      return await this.fallbackToRawSearch(userQuery);
    }
  }

  /**
   * Fallback to raw YouTube search if best match algorithm fails
   */
  private async fallbackToRawSearch(query: string): Promise<BestMatchResult | null> {
    try {
      const results = await youtubeService.searchSongs(query, 1);
      if (results && results.length > 0) {
        return {
          ...results[0],
          matchScore: 0,
          durationDelta: 0,
          isBestMatch: false
        };
      }
    } catch (error) {
      console.error('Fallback search also failed:', error);
    }
    return null;
  }
}

export const bestMatchService = new BestMatchService();

