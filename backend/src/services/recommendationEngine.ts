/**
 * RecommendationEngine Service
 * "Infinite Context" Shuffle Algorithm
 *
 * Implements the YouTube/Musi-like shuffle experience:
 * - Keep users in their current "vibe" (genre/culture/language)
 * - Balance Familiarity (songs they know) with Discovery (related hits)
 * - Use collaborative filtering ("wisdom of the crowd")
 */

import { Types } from 'mongoose';
import { Song, ISong } from '../models/Song';
import { UserLibrary } from '../models/UserLibrary';
import { TransitionLog } from '../models/TransitionLog';
import {
  RecommendationTrack,
  UserSessionContext,
  AlgorithmWeights,
  ScoredCandidate,
  DEFAULT_WEIGHTS,
  RecommendationResponse,
  GenreInference,
  GENRE_KEYWORDS,
  LANGUAGE_PATTERNS,
  CULTURE_KEYWORDS,
  TrackId
} from '../types/recommendation';

class RecommendationEngine {
  private weights: AlgorithmWeights;

  constructor(weights: AlgorithmWeights = DEFAULT_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * MAIN ENTRY POINT: Get the next track recommendation
   */
  async getNextTrack(context: UserSessionContext): Promise<RecommendationResponse> {
    const startTime = Date.now();
    console.log(`[Recommendation] Starting for track: ${context.currentTrack.title}`);

    try {
      // Phase 1: Generate candidates from multiple sources
      const candidates = await this.getCandidates(context);
      console.log(`[Recommendation] Phase 1: Generated ${candidates.length} candidates`);

      const initialCount = candidates.length;

      // Phase 2: Apply hard filters (vibe guard)
      const filtered = this.applyVibeFilter(candidates, context);
      console.log(`[Recommendation] Phase 2: ${filtered.length} after vibe filter`);

      const afterVibeCount = filtered.length;

      // Phase 3: Remove duplicates and recent history
      const deduped = this.deduplicateAndFilter(filtered, context);
      console.log(`[Recommendation] Phase 3: ${deduped.length} after dedup`);

      const afterDedupCount = deduped.length;

      // Phase 4: Score all candidates
      const scored = await this.scoreAllCandidates(deduped, context);
      console.log(`[Recommendation] Phase 4: Scored ${scored.length} candidates`);

      // Phase 5: Smart selection (80/20 rule)
      const { selected, method, alternatives } = this.smartSelect(scored, context);

      const duration = Date.now() - startTime;
      console.log(`[Recommendation] Completed in ${duration}ms. Selected: ${selected.track.title} (${method})`);

      return {
        nextTrack: selected.track,
        alternatives: alternatives.map(s => s.track),
        debug: {
          candidateCount: initialCount,
          filterStats: {
            initial: initialCount,
            afterVibeFilter: afterVibeCount,
            afterDedup: afterDedupCount,
            final: scored.length
          },
          topScores: scored.slice(0, 5),
          selectionMethod: method
        }
      };
    } catch (error) {
      console.error('[Recommendation] Error:', error);
      // Fallback: return a random popular song
      return this.getFallbackRecommendation(context);
    }
  }

  /**
   * PHASE 1: Candidate Generation
   * Fetch candidates from 3 sources: Graph, User History, Trending
   */
  private async getCandidates(context: UserSessionContext): Promise<RecommendationTrack[]> {
    const candidates: RecommendationTrack[] = [];

    // Source A: Knowledge Graph (Collaborative Filtering)
    // "What do other users play after this song?"
    const graphCandidates = await this.getGraphCandidates(context.currentTrack.youtubeId, 20);
    candidates.push(...graphCandidates.map(t => ({ ...t, source: 'graph' as const })));

    // Source B: User Affinity (Personal History)
    // Songs user loves that match current vibe
    if (!context.isAnonymous && context.userId) {
      const affinityCandidates = await this.getUserAffinityCandidates(context, 20);
      candidates.push(...affinityCandidates.map(t => ({ ...t, source: 'user_history' as const })));
    }

    // Source C: Trending Discovery
    // New/trending songs in the same genre/culture
    const trendingCandidates = await this.getTrendingCandidates(context.currentTrack, 10);
    candidates.push(...trendingCandidates.map(t => ({ ...t, source: 'trending' as const })));

    // Source D: Related (by artist/channel)
    const relatedCandidates = await this.getRelatedCandidates(context.currentTrack, 10);
    candidates.push(...relatedCandidates.map(t => ({ ...t, source: 'related' as const })));

    return candidates;
  }

  /**
   * Get candidates from the transition graph (collaborative filtering)
   */
  private async getGraphCandidates(currentTrackId: string, limit: number): Promise<RecommendationTrack[]> {
    try {
      const transitions = await TransitionLog.getTransitionProbabilities(currentTrackId, limit);

      if (transitions.length === 0) {
        return [];
      }

      const trackIds = transitions.map(t => t.toTrackId);
      const songs = await Song.find({ youtubeId: { $in: trackIds } }).lean();

      return songs.map(song => this.songToRecommendationTrack(song as ISong));
    } catch (error) {
      console.error('[Recommendation] Graph candidates error:', error);
      return [];
    }
  }

  /**
   * Get candidates from user's personal history that match current vibe
   */
  private async getUserAffinityCandidates(
    context: UserSessionContext,
    limit: number
  ): Promise<RecommendationTrack[]> {
    try {
      if (!context.userId) return [];

      const userLibrary = await UserLibrary.findOne({ user: context.userId })
        .populate('favoriteSongs')
        .populate('recentlyPlayed.song')
        .lean();

      if (!userLibrary) return [];

      const candidates: ISong[] = [];

      // Add favorite songs
      if (userLibrary.favoriteSongs) {
        candidates.push(...(userLibrary.favoriteSongs as ISong[]));
      }

      // Add recently played
      if (userLibrary.recentlyPlayed) {
        const recentSongs = userLibrary.recentlyPlayed
          .map(rp => rp.song as ISong)
          .filter(Boolean);
        candidates.push(...recentSongs);
      }

      // Filter to match current vibe (genre overlap)
      const currentGenres = context.currentTrack.genres;
      const currentLanguage = context.currentTrack.language;

      const vibeMatched = candidates.filter(song => {
        const inference = this.inferGenre(song);
        const hasGenreOverlap = inference.genres.some(g => currentGenres.includes(g));
        const languageMatch = inference.language === currentLanguage || inference.language === 'unknown';
        return hasGenreOverlap || languageMatch;
      });

      return vibeMatched.slice(0, limit).map(song => this.songToRecommendationTrack(song));
    } catch (error) {
      console.error('[Recommendation] User affinity error:', error);
      return [];
    }
  }

  /**
   * Get trending songs in the same genre/culture
   */
  private async getTrendingCandidates(
    currentTrack: RecommendationTrack,
    limit: number
  ): Promise<RecommendationTrack[]> {
    try {
      // Get trending songs (high view count, recent)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trending = await Song.find({
        publishedAt: { $gte: thirtyDaysAgo },
        viewCount: { $gte: 10000 }
      })
        .sort({ viewCount: -1, playCount: -1 })
        .limit(limit * 2)
        .lean();

      // Filter to match current genre/culture
      const matched = trending.filter(song => {
        const inference = this.inferGenre(song as ISong);
        return inference.genres.some(g => currentTrack.genres.includes(g)) ||
               inference.cultureTags.some(c => currentTrack.cultureTags.includes(c));
      });

      return matched.slice(0, limit).map(song => this.songToRecommendationTrack(song as ISong));
    } catch (error) {
      console.error('[Recommendation] Trending candidates error:', error);
      return [];
    }
  }

  /**
   * Get related songs (same artist/channel)
   */
  private async getRelatedCandidates(
    currentTrack: RecommendationTrack,
    limit: number
  ): Promise<RecommendationTrack[]> {
    try {
      const related = await Song.find({
        $or: [
          { channelId: currentTrack.channelId },
          { artist: currentTrack.artist }
        ],
        youtubeId: { $ne: currentTrack.youtubeId }
      })
        .sort({ playCount: -1 })
        .limit(limit)
        .lean();

      return related.map(song => this.songToRecommendationTrack(song as ISong));
    } catch (error) {
      console.error('[Recommendation] Related candidates error:', error);
      return [];
    }
  }

  /**
   * PHASE 2: Vibe Guard (Hard Filtering)
   * Remove candidates that would break the immersion
   */
  private applyVibeFilter(
    candidates: RecommendationTrack[],
    context: UserSessionContext
  ): RecommendationTrack[] {
    const currentLanguage = context.currentTrack.language;
    const isDistinctLanguage = currentLanguage && currentLanguage !== 'en' && currentLanguage !== 'unknown';

    return candidates.filter(candidate => {
      // Filter 1: Language Lock
      // If current song is in a distinct language, keep same language or instrumental
      if (isDistinctLanguage) {
        const candidateLanguage = candidate.language;
        if (candidateLanguage !== currentLanguage &&
            candidateLanguage !== 'instrumental' &&
            candidateLanguage !== 'unknown') {
          return false;
        }
      }

      // Filter 2: Blocked songs
      if (context.blockedTrackIds.has(candidate.youtubeId)) {
        return false;
      }

      return true;
    });
  }

  /**
   * PHASE 3: Deduplication
   * Remove current track and recently played songs
   */
  private deduplicateAndFilter(
    candidates: RecommendationTrack[],
    context: UserSessionContext
  ): RecommendationTrack[] {
    const seen = new Set<string>();
    seen.add(context.currentTrack.youtubeId);
    context.recentHistory.forEach(id => seen.add(id));

    return candidates.filter(candidate => {
      if (seen.has(candidate.youtubeId)) {
        return false;
      }
      seen.add(candidate.youtubeId);
      return true;
    });
  }

  /**
   * PHASE 4: Scoring Engine
   * Calculate a score (0-100) for each candidate
   */
  private async scoreAllCandidates(
    candidates: RecommendationTrack[],
    context: UserSessionContext
  ): Promise<ScoredCandidate[]> {
    const scored: ScoredCandidate[] = [];

    for (const candidate of candidates) {
      const breakdown = await this.calculateScore(candidate, context);
      const totalScore =
        breakdown.similarityScore +
        breakdown.familiarityScore +
        breakdown.continuityScore +
        breakdown.discoveryScore +
        breakdown.popularityScore -
        breakdown.penalties;

      const isFamiliar = context.likedTrackIds.has(candidate.youtubeId) ||
                         (context.globalListenCount.get(candidate.youtubeId) || 0) > 3;

      scored.push({
        track: candidate,
        score: Math.max(0, Math.min(100, totalScore)),
        breakdown,
        source: (candidate as any).source || 'related',
        isFamiliar,
        isDiscovery: !isFamiliar
      });
    }

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate score for a single candidate
   */
  private async calculateScore(
    candidate: RecommendationTrack,
    context: UserSessionContext
  ): Promise<ScoredCandidate['breakdown']> {
    let similarityScore = 0;
    let familiarityScore = 0;
    let continuityScore = 0;
    let discoveryScore = 0;
    let popularityScore = 0;
    let penalties = 0;

    // 1. SIMILARITY SCORE (max 40 pts)
    // Based on genre/culture overlap
    const commonGenres = candidate.genres.filter(g =>
      context.currentTrack.genres.includes(g)
    );
    similarityScore += commonGenres.length * 10; // 10 pts per matching genre

    const commonCulture = candidate.cultureTags.filter(c =>
      context.currentTrack.cultureTags.includes(c)
    );
    similarityScore += commonCulture.length * 5; // 5 pts per matching culture

    // Language match bonus
    if (candidate.language === context.currentTrack.language) {
      similarityScore += 10;
    }

    similarityScore = Math.min(40, similarityScore);

    // 2. FAMILIARITY SCORE (max 30 pts)
    if (context.likedTrackIds.has(candidate.youtubeId)) {
      familiarityScore += 30; // Huge boost for liked songs
    } else {
      const listenCount = context.globalListenCount.get(candidate.youtubeId) || 0;
      if (listenCount > 10) {
        familiarityScore += 25;
      } else if (listenCount > 5) {
        familiarityScore += 20;
      } else if (listenCount > 0) {
        familiarityScore += 10;
      }
    }

    // Followed artist bonus
    if (candidate.channelId && context.followedArtists.includes(candidate.channelId)) {
      familiarityScore += 10;
    }

    familiarityScore = Math.min(30, familiarityScore);

    // 3. CONTINUITY SCORE (max 20 pts)
    // Based on transition probability from collaborative filtering
    try {
      const transitions = await TransitionLog.getTransitionProbabilities(
        context.currentTrack.youtubeId,
        50
      );
      const transition = transitions.find(t => t.toTrackId === candidate.youtubeId);
      if (transition) {
        continuityScore = Math.min(20, transition.probability * 100);
      }
    } catch (error) {
      // Ignore errors, just don't add continuity score
    }

    // 4. DISCOVERY SCORE (max 10 pts)
    // New songs get a small nudge
    const listenCount = context.globalListenCount.get(candidate.youtubeId) || 0;
    if (listenCount === 0) {
      discoveryScore += 5;

      // Extra boost if it's from a familiar artist
      if (candidate.channelId && context.followedArtists.includes(candidate.channelId)) {
        discoveryScore += 5;
      }
    }

    // 5. POPULARITY SCORE (max 10 pts)
    // Slight boost for popular songs
    if (candidate.viewCount > 10000000) {
      popularityScore += 10;
    } else if (candidate.viewCount > 1000000) {
      popularityScore += 7;
    } else if (candidate.viewCount > 100000) {
      popularityScore += 5;
    } else if (candidate.viewCount > 10000) {
      popularityScore += 3;
    }

    // PENALTIES
    // Same song played recently (in session)
    if (context.recentHistory.includes(candidate.youtubeId)) {
      penalties += 50; // Heavy penalty
    }

    // Same artist played too recently
    const recentArtistCount = context.recentHistory.slice(0, 5).filter(id => {
      // Check if recently played songs are from same artist
      // (This would need more context, simplified here)
      return false; // Placeholder
    }).length;
    if (recentArtistCount > 2) {
      penalties += 20;
    }

    return {
      similarityScore,
      familiarityScore,
      continuityScore,
      discoveryScore,
      popularityScore,
      penalties
    };
  }

  /**
   * PHASE 5: Smart Selection (80/20 Rule)
   * Don't just pick #1 - add variety with weighted random selection
   */
  private smartSelect(
    scored: ScoredCandidate[],
    context: UserSessionContext
  ): {
    selected: ScoredCandidate;
    method: 'familiar' | 'discovery' | 'random';
    alternatives: ScoredCandidate[];
  } {
    if (scored.length === 0) {
      throw new Error('No candidates to select from');
    }

    // Take top 5 candidates
    const top5 = scored.slice(0, 5);
    const alternatives = top5;

    // Separate into familiar and discovery
    const familiarCandidates = top5.filter(c => c.isFamiliar);
    const discoveryCandidates = top5.filter(c => c.isDiscovery);

    // Apply 80/20 rule
    const roll = Math.random();

    let selected: ScoredCandidate;
    let method: 'familiar' | 'discovery' | 'random';

    if (roll > 0.2 && familiarCandidates.length > 0) {
      // 80% chance: pick from familiar (weighted random)
      selected = this.weightedRandomSelect(familiarCandidates);
      method = 'familiar';
    } else if (discoveryCandidates.length > 0) {
      // 20% chance: pick from discovery
      selected = this.weightedRandomSelect(discoveryCandidates);
      method = 'discovery';
    } else {
      // Fallback: just pick the best one
      selected = top5[0];
      method = 'random';
    }

    return { selected, method, alternatives };
  }

  /**
   * Weighted random selection based on scores
   */
  private weightedRandomSelect(candidates: ScoredCandidate[]): ScoredCandidate {
    const totalScore = candidates.reduce((sum, c) => sum + c.score, 0);
    if (totalScore === 0) return candidates[0];

    let random = Math.random() * totalScore;
    for (const candidate of candidates) {
      random -= candidate.score;
      if (random <= 0) {
        return candidate;
      }
    }

    return candidates[0];
  }

  /**
   * Fallback recommendation when algorithm fails
   * This should ALWAYS return something to keep the vibes going
   */
  private async getFallbackRecommendation(
    context: UserSessionContext
  ): Promise<RecommendationResponse> {
    console.log('[Recommendation] Using fallback - keeping the vibes going!');

    // Build list of songs to exclude (recently played)
    const excludeIds = [
      context.currentTrack.youtubeId,
      ...context.recentHistory
    ];

    // Try to get songs matching the current genre first
    const currentGenres = context.currentTrack.genres;
    let fallbackSongs: any[] = [];

    if (currentGenres.length > 0) {
      // First try: genre-matched popular songs
      fallbackSongs = await Song.find({
        youtubeId: { $nin: excludeIds },
        $or: currentGenres.map(genre => ({
          $or: [
            { tags: { $regex: genre, $options: 'i' } },
            { title: { $regex: genre, $options: 'i' } }
          ]
        }))
      })
        .sort({ playCount: -1, viewCount: -1 })
        .limit(20)
        .lean();
    }

    // Second try: any popular songs not in history
    if (fallbackSongs.length < 5) {
      console.log('[Recommendation] Fallback: fetching popular songs...');
      const popularSongs = await Song.find({
        youtubeId: { $nin: excludeIds }
      })
        .sort({ playCount: -1, viewCount: -1 })
        .limit(20)
        .lean();

      // Merge with genre-matched, avoiding duplicates
      const existingIds = new Set(fallbackSongs.map(s => s.youtubeId));
      for (const song of popularSongs) {
        if (!existingIds.has(song.youtubeId)) {
          fallbackSongs.push(song);
          if (fallbackSongs.length >= 20) break;
        }
      }
    }

    // Third try: ANY songs if still empty (allow repeats)
    if (fallbackSongs.length === 0) {
      console.log('[Recommendation] Fallback: allowing repeats...');
      fallbackSongs = await Song.find({})
        .sort({ playCount: -1, viewCount: -1 })
        .limit(20)
        .lean();
    }

    if (fallbackSongs.length > 0) {
      // Pick a random song from top 10
      const randomIndex = Math.floor(Math.random() * Math.min(10, fallbackSongs.length));
      const selected = this.songToRecommendationTrack(fallbackSongs[randomIndex] as ISong);

      console.log('[Recommendation] Fallback selected:', selected.title);

      return {
        nextTrack: selected,
        alternatives: fallbackSongs.slice(0, 5).map(s => this.songToRecommendationTrack(s as ISong))
      };
    }

    // This should never happen if there are ANY songs in the database
    throw new Error('No songs available for recommendation');
  }

  /**
   * Convert ISong to RecommendationTrack
   */
  private songToRecommendationTrack(song: ISong): RecommendationTrack {
    const inference = this.inferGenre(song);

    return {
      id: song._id?.toString() || song.youtubeId,
      youtubeId: song.youtubeId,
      title: song.title,
      artist: song.artist,
      channelId: song.channelId,
      duration: song.duration,
      thumbnail: song.thumbnail,
      thumbnailHd: song.thumbnailHd,
      genres: inference.genres,
      language: inference.language,
      cultureTags: inference.cultureTags,
      viewCount: song.viewCount || 0,
      playCount: song.playCount || 0,
      publishedAt: song.publishedAt
    };
  }

  /**
   * Infer genre, language, and culture from song metadata
   */
  inferGenre(song: ISong | Partial<ISong>): GenreInference {
    const searchText = [
      song.title || '',
      song.artist || '',
      song.channelTitle || '',
      song.description || '',
      ...(song.tags || [])
    ].join(' ').toLowerCase();

    const genres: string[] = [];
    const cultureTags: string[] = [];
    let language = 'unknown';
    let confidence = 0;

    // Match genres
    for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
      if (keywords.some(kw => searchText.includes(kw))) {
        genres.push(genre);
        confidence += 0.2;
      }
    }

    // Match language
    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(searchText))) {
        language = lang;
        confidence += 0.3;
        break;
      }
    }

    // Match culture
    for (const [culture, keywords] of Object.entries(CULTURE_KEYWORDS)) {
      if (keywords.some(kw => searchText.includes(kw))) {
        cultureTags.push(culture);
        confidence += 0.1;
      }
    }

    // Default genre if none found
    if (genres.length === 0) {
      genres.push('pop');
    }

    return {
      genres,
      language,
      cultureTags,
      confidence: Math.min(1, confidence)
    };
  }

  /**
   * Build user session context from user data
   */
  async buildSessionContext(
    userId: string | null,
    currentTrack: ISong,
    sessionHistory: string[] = []
  ): Promise<UserSessionContext> {
    const currentRecommendationTrack = this.songToRecommendationTrack(currentTrack);

    let likedTrackIds = new Set<TrackId>();
    let blockedTrackIds = new Set<TrackId>();
    let globalListenCount = new Map<TrackId, number>();
    let followedArtists: string[] = [];
    let isAnonymous = true;

    if (userId) {
      isAnonymous = false;
      const userLibrary = await UserLibrary.findOne({ user: userId })
        .populate('favoriteSongs')
        .populate('blockedSongs')
        .lean();

      if (userLibrary) {
        // Build liked tracks set
        if (userLibrary.favoriteSongs) {
          (userLibrary.favoriteSongs as ISong[]).forEach(song => {
            if (song?.youtubeId) {
              likedTrackIds.add(song.youtubeId);
            }
          });
        }

        // Build blocked tracks set
        if (userLibrary.blockedSongs) {
          (userLibrary.blockedSongs as ISong[]).forEach(song => {
            if (song?.youtubeId) {
              blockedTrackIds.add(song.youtubeId);
            }
          });
        }

        // Build listen count from history
        if (userLibrary.listeningHistory) {
          for (const entry of userLibrary.listeningHistory as any[]) {
            const songId = entry.song?.youtubeId;
            if (songId) {
              globalListenCount.set(songId, (globalListenCount.get(songId) || 0) + 1);
            }
          }
        }

        // Get followed artists
        followedArtists = userLibrary.followedArtists || [];
      }
    }

    return {
      userId,
      currentTrack: currentRecommendationTrack,
      recentHistory: sessionHistory,
      likedTrackIds,
      blockedTrackIds,
      globalListenCount,
      followedArtists,
      sessionStartTime: new Date(),
      isAnonymous
    };
  }
}

// Export singleton instance
export const recommendationEngine = new RecommendationEngine();
