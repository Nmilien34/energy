/**
 * Recommendation Engine Type Definitions
 * "Infinite Context" Shuffle Algorithm
 */

import { Types } from 'mongoose';
import { ISong } from '../models/Song';

export type TrackId = string;
export type UserId = string;

/**
 * Extended Track interface with recommendation metadata
 * The "Node" in our recommendation graph
 */
export interface RecommendationTrack {
  id: TrackId;
  youtubeId: string;
  title: string;
  artist: string;
  channelId?: string;

  // Core metadata
  duration: number;
  thumbnail: string;
  thumbnailHd?: string;

  // Vibe matching metadata (extracted or inferred)
  genres: string[];           // e.g., ['Kompa', 'Zouk', 'R&B']
  language: string;           // e.g., 'ht' (Haitian Creole), 'en', 'fr'
  cultureTags: string[];      // e.g., ['Caribbean', 'Haiti', 'Latin']
  mood?: string;              // e.g., 'chill', 'party', 'romantic'

  // Audio characteristics (can be inferred from title/tags or via API)
  bpm?: number;               // Beats per minute
  energyLevel?: number;       // 1-10 scale

  // Popularity metrics
  viewCount: number;
  playCount: number;
  publishedAt?: Date;

  // Optional: Vector embedding for AI-based similarity
  vector?: number[];
}

/**
 * User's current session context
 * Contains all the data needed to calculate the next track
 */
export interface UserSessionContext {
  userId: UserId | null;      // null for anonymous users
  currentTrack: RecommendationTrack;

  // Session history (last 10-20 songs in THIS session)
  recentHistory: TrackId[];

  // User preferences (if authenticated)
  likedTrackIds: Set<TrackId>;
  blockedTrackIds: Set<TrackId>;

  // Global listen counts (how many times user played specific songs)
  globalListenCount: Map<TrackId, number>;

  // Followed artists (channel IDs)
  followedArtists: string[];

  // Session metadata
  sessionStartTime: Date;
  isAnonymous: boolean;
}

/**
 * Scoring weights to tune the recommendation "feel"
 * These can be adjusted per user or globally
 */
export interface AlgorithmWeights {
  familiarity: number;    // Weight for songs user knows (default: 0.3)
  similarity: number;     // Weight for genre/audio match (default: 0.4)
  popularity: number;     // Weight for global trends (default: 0.1)
  discovery: number;      // Weight for fresh songs (default: 0.2)
}

/**
 * Default weights that create the "Musi-like" experience
 */
export const DEFAULT_WEIGHTS: AlgorithmWeights = {
  familiarity: 0.35,    // Users love hearing songs they know
  similarity: 0.40,     // Keep the vibe consistent
  popularity: 0.10,     // Mix in some popular tracks
  discovery: 0.15       // Introduce new music gradually
};

/**
 * Scored candidate track with all scoring details
 */
export interface ScoredCandidate {
  track: RecommendationTrack;
  score: number;

  // Score breakdown for debugging/tuning
  breakdown: {
    similarityScore: number;
    familiarityScore: number;
    continuityScore: number;
    discoveryScore: number;
    popularityScore: number;
    penalties: number;
  };

  // Metadata
  source: 'graph' | 'user_history' | 'trending' | 'related';
  isFamiliar: boolean;
  isDiscovery: boolean;
}

/**
 * Transition log entry - the brain of the algorithm
 * Tracks what songs users play after other songs
 */
export interface TransitionEntry {
  fromTrackId: TrackId;
  toTrackId: TrackId;
  userId?: UserId;          // Optional: who made this transition
  timestamp: Date;
  sessionId?: string;       // Group transitions by session
  completed: boolean;       // Did they finish the first song?
}

/**
 * Aggregated transition data for a track pair
 */
export interface TransitionStats {
  fromTrackId: TrackId;
  toTrackId: TrackId;
  transitionCount: number;
  uniqueUsers: number;
  avgCompletionRate: number;
  lastTransition: Date;
}

/**
 * Genre/Culture inference result
 */
export interface GenreInference {
  genres: string[];
  language: string;
  cultureTags: string[];
  confidence: number;       // 0-1 how confident we are in this inference
}

/**
 * Recommendation request from API
 */
export interface RecommendationRequest {
  currentTrackId: TrackId;
  userId?: UserId;
  sessionHistory?: TrackId[];
  weights?: Partial<AlgorithmWeights>;
  limit?: number;           // How many recommendations to return
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
  nextTrack: RecommendationTrack;
  alternatives: RecommendationTrack[];  // Top 5 alternatives
  debug?: {
    candidateCount: number;
    filterStats: {
      initial: number;
      afterVibeFilter: number;
      afterDedup: number;
      final: number;
    };
    topScores: ScoredCandidate[];
    selectionMethod: 'familiar' | 'discovery' | 'random';
  };
}

/**
 * Genre mapping for common music patterns
 * Used to infer genre from title/tags/channel
 */
export const GENRE_KEYWORDS: Record<string, string[]> = {
  'kompa': ['kompa', 'konpa', 'compas'],
  'zouk': ['zouk', 'zouklove', 'zouk love'],
  'reggaeton': ['reggaeton', 'reggeaton', 'regueton'],
  'afrobeats': ['afrobeats', 'afrobeat', 'afro'],
  'dancehall': ['dancehall', 'dance hall'],
  'hip-hop': ['hip hop', 'hip-hop', 'hiphop', 'rap'],
  'r&b': ['r&b', 'rnb', 'r & b', 'soul'],
  'pop': ['pop'],
  'latin': ['latin', 'latino', 'bachata', 'salsa', 'merengue'],
  'electronic': ['edm', 'electronic', 'house', 'techno'],
  'rock': ['rock', 'alternative'],
  'jazz': ['jazz'],
  'classical': ['classical', 'orchestra'],
  'country': ['country'],
  'gospel': ['gospel', 'worship', 'christian'],
  'amapiano': ['amapiano', 'piano'],
};

/**
 * Language detection patterns
 */
export const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  'ht': [/creole/i, /kreyol/i, /ayiti/i, /haiti/i],
  'fr': [/french/i, /français/i, /francais/i],
  'es': [/spanish/i, /español/i, /espanol/i, /latino/i],
  'pt': [/portuguese/i, /português/i, /brasil/i],
  'en': [/english/i],
};

/**
 * Culture tags mapping
 */
export const CULTURE_KEYWORDS: Record<string, string[]> = {
  'Caribbean': ['caribbean', 'jamaica', 'haiti', 'trinidad', 'barbados', 'bahamas'],
  'African': ['african', 'nigeria', 'ghana', 'south africa', 'kenya', 'afro'],
  'Latin': ['latin', 'latino', 'mexico', 'puerto rico', 'colombia', 'brazil'],
  'American': ['american', 'usa', 'us'],
  'European': ['european', 'uk', 'british', 'french', 'spanish'],
  'Asian': ['asian', 'kpop', 'jpop', 'korean', 'japanese', 'chinese'],
};
