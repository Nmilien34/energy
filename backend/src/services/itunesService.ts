/**
 * iTunes Search API Service
 * Free, no API key required
 * Provides "Golden Record" metadata for music tracks
 */

export interface iTunesTrack {
  trackName: string;
  artistName: string;
  trackTimeMillis: number; // Duration in milliseconds
  collectionName?: string; // Album name
  artworkUrl100?: string; // Album artwork
  previewUrl?: string; // Preview audio URL
  trackId?: number;
  collectionId?: number;
}

export interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesTrack[];
}

class iTunesService {
  private readonly baseUrl = 'https://itunes.apple.com/search';

  /**
   * Search iTunes for a track to get the "Golden Record" metadata
   * This is Phase 1 of the Musi Algorithm - the "Shadow Request"
   */
  async searchTrack(query: string, limit: number = 1): Promise<iTunesTrack | null> {
    try {
      const params = new URLSearchParams({
        term: query,
        media: 'music',
        entity: 'song',
        limit: limit.toString(),
        country: 'US' // US has the best music catalog
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; MusicPlayer/1.0)'
        }
      });

      if (!response.ok) {
        console.warn(`iTunes API returned ${response.status}: ${response.statusText}`);
        return null;
      }

      const data: iTunesSearchResponse = await response.json();

      if (!data.results || data.results.length === 0) {
        console.log(`No iTunes results for query: "${query}"`);
        return null;
      }

      // Return the top result (most relevant)
      const topResult = data.results[0];
      
      console.log(`✓ iTunes Golden Record found: "${topResult.trackName}" by ${topResult.artistName} (${topResult.trackTimeMillis}ms)`);
      
      return topResult;
    } catch (error: any) {
      console.error('Error fetching iTunes metadata:', error.message);
      return null;
    }
  }

  /**
   * Get multiple track results (for fallback scenarios)
   */
  async searchTracks(query: string, limit: number = 5): Promise<iTunesTrack[]> {
    try {
      const params = new URLSearchParams({
        term: query,
        media: 'music',
        entity: 'song',
        limit: limit.toString(),
        country: 'US'
      });

      const url = `${this.baseUrl}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; MusicPlayer/1.0)'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data: iTunesSearchResponse = await response.json();
      return data.results || [];
    } catch (error: any) {
      console.error('Error fetching iTunes tracks:', error.message);
      return [];
    }
  }
}

export const itunesService = new iTunesService();


