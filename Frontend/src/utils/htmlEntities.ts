/**
 * Decode HTML entities (e.g., &#39; -> ', &amp; -> &)
 * This is a safety measure in case any HTML entities slip through from the backend
 */
export const decodeHtmlEntities = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  const entityMap: { [key: string]: string } = {
    '&apos;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&#8217;': "'", // Right single quotation mark
    '&#8216;': "'", // Left single quotation mark
    '&#8220;': '"', // Left double quotation mark
    '&#8221;': '"', // Right double quotation mark
    '&#8211;': '–', // En dash
    '&#8212;': '—', // Em dash
  };

  // Decode numeric entities (&#39;, &#8217;, etc.)
  let decoded = text.replace(/&#(\d+);/g, (match, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return match; // Return original if parsing fails
    }
  });

  // Decode named entities (&amp;, &quot;, etc.)
  for (const [entity, char] of Object.entries(entityMap)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  return decoded;
};

/**
 * Clean and decode song title for display
 */
export const cleanSongTitle = (title: string): string => {
  if (!title) return '';
  
  // First decode HTML entities
  let cleaned = decodeHtmlEntities(title);
  
  // Then clean up formatting (optional - backend should handle this, but safety measure)
  cleaned = cleaned
    .replace(/\[.*?\]/g, '') // Remove square brackets
    .replace(/\(.*?\)/g, '') // Remove parentheses
    .replace(/【.*?】/g, '') // Remove Japanese brackets
    .replace(/Official.*?Video/gi, '')
    .replace(/Official.*?Audio/gi, '')
    .replace(/Music.*?Video/gi, '')
    .replace(/HD|4K|1080p|720p/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
};

/**
 * Clean and decode artist name for display
 */
export const cleanArtistName = (artist: string): string => {
  if (!artist) return '';
  return decodeHtmlEntities(artist).trim();
};


