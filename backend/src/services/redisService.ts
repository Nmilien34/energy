import Redis from 'ioredis';
import { config } from '../utils/config';
import { YouTubeSearchResult } from './youtubeService';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

class RedisService {
  private client: Redis | null = null;
  private isEnabled: boolean = false;
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly SEARCH_CACHE_TTL = 3600; // 1 hour for search results
  private readonly AUDIO_URL_TTL = 21600; // 6 hours for audio URLs
  private readonly TRENDING_TTL = 43200; // 12 hours for trending

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  private initialize(): void {
    const redisUrl = config.redis?.url;

    if (!redisUrl) {
      console.warn('Redis URL not configured. Caching will be disabled.');
      this.isEnabled = false;
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            // Only reconnect when the error contains "READONLY"
            return true;
          }
          return false;
        }
      });

      this.client.on('connect', () => {
        console.log('✓ Redis connected successfully');
        this.isEnabled = true;
      });

      this.client.on('error', (err: Error) => {
        console.error('Redis connection error:', err.message);
        this.isEnabled = false;
      });

      this.client.on('ready', () => {
        console.log('✓ Redis ready for operations');
        this.isEnabled = true;
      });

      this.client.on('close', () => {
        console.warn('Redis connection closed');
        this.isEnabled = false;
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check if Redis is enabled and connected
   */
  isAvailable(): boolean {
    return this.isEnabled && this.client !== null && this.client.status === 'ready';
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace: string = 'default'): string {
    return `music:${namespace}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const value = await this.client!.get(fullKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const serialized = JSON.stringify(value);
      const ttl = options.ttl || this.DEFAULT_TTL;

      await this.client!.setex(fullKey, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace);
      await this.client!.del(fullKey);
      return true;
    } catch (error) {
      console.error(`Redis del error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query: string, results: YouTubeSearchResult[]): Promise<boolean> {
    const normalizedQuery = this.normalizeSearchQuery(query);
    return this.set(normalizedQuery, results, {
      namespace: 'search',
      ttl: this.SEARCH_CACHE_TTL
    });
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query: string): Promise<YouTubeSearchResult[] | null> {
    const normalizedQuery = this.normalizeSearchQuery(query);
    return this.get<YouTubeSearchResult[]>(normalizedQuery, {
      namespace: 'search'
    });
  }

  /**
   * Cache audio URL for a song
   */
  async cacheAudioUrl(songId: string, audioData: {
    url: string;
    expires: Date;
    quality: string;
    format: string;
  }): Promise<boolean> {
    return this.set(`audio:${songId}`, audioData, {
      namespace: 'audio',
      ttl: this.AUDIO_URL_TTL
    });
  }

  /**
   * Get cached audio URL
   */
  async getCachedAudioUrl(songId: string): Promise<{
    url: string;
    expires: Date;
    quality: string;
    format: string;
  } | null> {
    const cached = await this.get<{
      url: string;
      expires: string;
      quality: string;
      format: string;
    }>(`audio:${songId}`, {
      namespace: 'audio'
    });

    if (!cached) {
      return null;
    }

    // Check if URL has expired
    const expiresDate = new Date(cached.expires);
    if (expiresDate <= new Date()) {
      // Expired, delete from cache
      await this.del(`audio:${songId}`, { namespace: 'audio' });
      return null;
    }

    return {
      ...cached,
      expires: expiresDate
    };
  }

  /**
   * Cache trending results
   */
  async cacheTrending(region: string, results: YouTubeSearchResult[]): Promise<boolean> {
    return this.set(`trending:${region}`, results, {
      namespace: 'trending',
      ttl: this.TRENDING_TTL
    });
  }

  /**
   * Get cached trending results
   */
  async getCachedTrending(region: string): Promise<YouTubeSearchResult[] | null> {
    return this.get<YouTubeSearchResult[]>(`trending:${region}`, {
      namespace: 'trending'
    });
  }

  /**
   * Normalize search query for consistent caching
   */
  private normalizeSearchQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAll(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      // Clear all keys with our namespace prefix
      const pattern = 'music:*';
      const stream = this.client!.scanStream({
        match: pattern,
        count: 100
      });

      const pipeline = this.client!.pipeline();
      let keysDeleted = 0;

      for await (const keys of stream) {
        for (const key of keys) {
          pipeline.del(key);
          keysDeleted++;
        }
      }

      await pipeline.exec();
      console.log(`Cleared ${keysDeleted} keys from Redis cache`);
      return true;
    } catch (error) {
      console.error('Redis clearAll error:', error);
      return false;
    }
  }

  /**
   * Clear expired entries (optional maintenance)
   */
  async clearExpired(): Promise<void> {
    // Redis automatically handles TTL expiration, but we can log stats
    if (!this.isAvailable()) {
      return;
    }

    try {
      const info = await this.client!.info('stats');
      console.log('Redis cache stats:', info);
    } catch (error) {
      console.error('Redis clearExpired error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    isEnabled: boolean;
    isConnected: boolean;
    keyCount?: number;
    memoryUsed?: string;
  }> {
    const stats: any = {
      isEnabled: this.isEnabled,
      isConnected: this.isAvailable()
    };

    if (this.isAvailable()) {
      try {
        const dbsize = await this.client!.dbsize();
        const info = await this.client!.info('memory');
        const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);

        stats.keyCount = dbsize;
        stats.memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      } catch (error) {
        console.error('Redis getStats error:', error);
      }
    }

    return stats;
  }

  /**
   * Gracefully close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isEnabled = false;
      console.log('Redis connection closed');
    }
  }

  /**
   * Increment a counter (useful for tracking popular searches)
   */
  async incrementCounter(key: string, options: CacheOptions = {}): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const fullKey = this.buildKey(key, options.namespace || 'counter');
      const result = await this.client!.incr(fullKey);

      // Set expiration if TTL specified
      if (options.ttl) {
        await this.client!.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      console.error(`Redis incrementCounter error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Track popular searches
   */
  async trackPopularSearch(query: string): Promise<void> {
    const normalizedQuery = this.normalizeSearchQuery(query);
    await this.incrementCounter(`popular:${normalizedQuery}`, {
      namespace: 'analytics',
      ttl: 86400 // 24 hours
    });
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const pattern = this.buildKey('popular:*', 'analytics');
      const keys = await this.client!.keys(pattern);

      const results: Array<{ query: string; count: number }> = [];

      for (const key of keys) {
        const count = await this.client!.get(key);
        if (count) {
          const query = key.replace(this.buildKey('popular:', 'analytics'), '');
          results.push({ query, count: parseInt(count) });
        }
      }

      // Sort by count descending
      results.sort((a, b) => b.count - a.count);

      return results.slice(0, limit);
    } catch (error) {
      console.error('Redis getPopularSearches error:', error);
      return [];
    }
  }
}

export const redisService = new RedisService();
