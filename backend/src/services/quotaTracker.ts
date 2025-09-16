import { config } from '../utils/config';

interface QuotaUsage {
  searchRequests: number;
  videoDetailsRequests: number;
  totalUnitsUsed: number;
  lastReset: Date;
}

class QuotaTracker {
  private usage: QuotaUsage;
  private readonly DAILY_LIMIT = 10000; // YouTube API daily quota
  private readonly SEARCH_COST = 100;
  private readonly VIDEO_DETAILS_COST = 1;

  constructor() {
    this.usage = {
      searchRequests: 0,
      videoDetailsRequests: 0,
      totalUnitsUsed: 0,
      lastReset: new Date()
    };

    this.checkDailyReset();
  }

  /**
   * Check if we need to reset daily counters (midnight PT)
   */
  private checkDailyReset(): void {
    const now = new Date();
    const lastResetUTC = this.usage.lastReset.getTime();
    const nowUTC = now.getTime();

    // Convert to Pacific Time for YouTube's reset schedule
    const pacificOffset = -8 * 60 * 60 * 1000; // PST offset
    const lastResetPT = new Date(lastResetUTC + pacificOffset);
    const nowPT = new Date(nowUTC + pacificOffset);

    // Check if we've crossed into a new day
    if (lastResetPT.getDate() !== nowPT.getDate() ||
        lastResetPT.getMonth() !== nowPT.getMonth() ||
        lastResetPT.getFullYear() !== nowPT.getFullYear()) {
      this.resetDailyUsage();
    }
  }

  /**
   * Reset daily usage counters
   */
  private resetDailyUsage(): void {
    this.usage = {
      searchRequests: 0,
      videoDetailsRequests: 0,
      totalUnitsUsed: 0,
      lastReset: new Date()
    };
    console.log('YouTube API quota reset for new day');
  }

  /**
   * Check if we can make a search request (100 units)
   */
  canMakeSearchRequest(): boolean {
    this.checkDailyReset();
    return (this.usage.totalUnitsUsed + this.SEARCH_COST) <= this.DAILY_LIMIT;
  }

  /**
   * Check if we can make video details requests
   */
  canMakeVideoDetailsRequest(videoCount: number = 1): boolean {
    this.checkDailyReset();
    const cost = videoCount * this.VIDEO_DETAILS_COST;
    return (this.usage.totalUnitsUsed + cost) <= this.DAILY_LIMIT;
  }

  /**
   * Record a search request
   */
  recordSearchRequest(): void {
    this.usage.searchRequests++;
    this.usage.totalUnitsUsed += this.SEARCH_COST;
    console.log(`Search request recorded. Total units used: ${this.usage.totalUnitsUsed}/${this.DAILY_LIMIT}`);
  }

  /**
   * Record video details requests
   */
  recordVideoDetailsRequest(videoCount: number = 1): void {
    this.usage.videoDetailsRequests += videoCount;
    this.usage.totalUnitsUsed += (videoCount * this.VIDEO_DETAILS_COST);
    console.log(`Video details request recorded (${videoCount} videos). Total units used: ${this.usage.totalUnitsUsed}/${this.DAILY_LIMIT}`);
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): QuotaUsage & { remainingUnits: number; percentageUsed: number } {
    this.checkDailyReset();
    return {
      ...this.usage,
      remainingUnits: this.DAILY_LIMIT - this.usage.totalUnitsUsed,
      percentageUsed: (this.usage.totalUnitsUsed / this.DAILY_LIMIT) * 100
    };
  }

  /**
   * Check if we're approaching quota limit (80% used)
   */
  isApproachingLimit(): boolean {
    this.checkDailyReset();
    return (this.usage.totalUnitsUsed / this.DAILY_LIMIT) >= 0.8;
  }

  /**
   * Check if quota is exceeded
   */
  isQuotaExceeded(): boolean {
    this.checkDailyReset();
    return this.usage.totalUnitsUsed >= this.DAILY_LIMIT;
  }

  /**
   * Get priority level based on current quota usage
   * - LOW: < 50% used - normal operations
   * - MEDIUM: 50-80% used - be more conservative
   * - HIGH: 80-95% used - only essential requests
   * - CRITICAL: > 95% used - emergency mode
   */
  getPriorityLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const percentage = (this.usage.totalUnitsUsed / this.DAILY_LIMIT) * 100;

    if (percentage < 50) return 'LOW';
    if (percentage < 80) return 'MEDIUM';
    if (percentage < 95) return 'HIGH';
    return 'CRITICAL';
  }
}

export const quotaTracker = new QuotaTracker();