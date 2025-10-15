# Share API Documentation

Complete API documentation for the sharing feature that allows users to share playlists and songs with friends, with a 3-song limit for anonymous users.

## Overview

The sharing system allows authenticated users to:
- Create shareable links for playlists and individual songs
- Track views and plays on shared content
- Manage their shared content

Anonymous users (those who receive share links) can:
- View shared playlists and songs
- Play up to 3 songs before being prompted to create an account
- Only navigate within the shared content screen (restricted navigation)

## Base URL

All endpoints are prefixed with: `/api/share`

---

## Endpoints

### 1. Create Playlist Share

**Endpoint:** `POST /api/share/playlist/:playlistId`

**Authentication:** Required (JWT Bearer token)

**Description:** Creates a shareable link for a playlist. Returns existing share if one already exists.

**Path Parameters:**
- `playlistId` (string) - The MongoDB ObjectId of the playlist to share

**Response:**
```json
{
  "success": true,
  "data": {
    "shareId": "a1b2c3d4e5f6g7h8",
    "shareUrl": "http://localhost:3000/share/a1b2c3d4e5f6g7h8",
    "share": {
      "id": "507f1f77bcf86cd799439011",
      "shareId": "a1b2c3d4e5f6g7h8",
      "type": "playlist",
      "owner": {
        "id": "507f1f77bcf86cd799439012",
        "username": "john_doe",
        "profilePicture": "https://example.com/profile.jpg"
      },
      "playlist": "507f1f77bcf86cd799439013",
      "title": "My Awesome Playlist",
      "description": "The best songs collection",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "viewCount": 0,
      "playCount": 0,
      "isActive": true,
      "createdAt": "2025-01-14T10:00:00.000Z",
      "updatedAt": "2025-01-14T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401` - Authentication required
- `403` - You can only share your own playlists
- `404` - Playlist not found
- `500` - Server error

---

### 2. Create Song Share

**Endpoint:** `POST /api/share/song/:songId`

**Authentication:** Required (JWT Bearer token)

**Description:** Creates a shareable link for a single song. Returns existing share if one already exists.

**Path Parameters:**
- `songId` (string) - The MongoDB ObjectId or YouTube ID of the song to share

**Response:**
```json
{
  "success": true,
  "data": {
    "shareId": "x9y8z7w6v5u4t3s2",
    "shareUrl": "http://localhost:3000/share/x9y8z7w6v5u4t3s2",
    "share": {
      "id": "507f1f77bcf86cd799439014",
      "shareId": "x9y8z7w6v5u4t3s2",
      "type": "song",
      "owner": {
        "id": "507f1f77bcf86cd799439012",
        "username": "john_doe"
      },
      "song": "507f1f77bcf86cd799439015",
      "title": "Blinding Lights",
      "description": "The Weeknd - Blinding Lights",
      "thumbnail": "https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg",
      "viewCount": 0,
      "playCount": 0,
      "isActive": true,
      "createdAt": "2025-01-14T10:00:00.000Z",
      "updatedAt": "2025-01-14T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401` - Authentication required
- `404` - Song not found
- `500` - Server error

---

### 3. Get Shared Content

**Endpoint:** `GET /api/share/:shareId`

**Authentication:** Not required (Public)

**Description:** Retrieves the shared content (playlist or song) for a given share ID. Increments view count.

**Path Parameters:**
- `shareId` (string) - The unique share identifier from the URL

**Response for Playlist:**
```json
{
  "success": true,
  "data": {
    "share": {
      "id": "507f1f77bcf86cd799439011",
      "shareId": "a1b2c3d4e5f6g7h8",
      "type": "playlist",
      "owner": {
        "id": "507f1f77bcf86cd799439012",
        "username": "john_doe",
        "profilePicture": "https://example.com/profile.jpg"
      },
      "title": "My Awesome Playlist",
      "description": "The best songs collection",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "viewCount": 15,
      "playCount": 42,
      "createdAt": "2025-01-14T10:00:00.000Z"
    },
    "type": "playlist",
    "content": {
      "id": "507f1f77bcf86cd799439013",
      "name": "My Awesome Playlist",
      "description": "The best songs collection",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "songs": [
        {
          "id": "507f1f77bcf86cd799439015",
          "youtubeId": "4NRXx6U8ABQ",
          "title": "Blinding Lights",
          "artist": "The Weeknd",
          "duration": 200,
          "thumbnail": "https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg"
        }
      ],
      "isPublic": false,
      "playCount": 120,
      "createdAt": "2025-01-10T10:00:00.000Z"
    }
  }
}
```

**Response for Song:**
```json
{
  "success": true,
  "data": {
    "share": {
      "id": "507f1f77bcf86cd799439014",
      "shareId": "x9y8z7w6v5u4t3s2",
      "type": "song",
      "owner": {
        "id": "507f1f77bcf86cd799439012",
        "username": "john_doe"
      },
      "title": "Blinding Lights",
      "description": "The Weeknd - Blinding Lights",
      "thumbnail": "https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg",
      "viewCount": 8,
      "playCount": 23
    },
    "type": "song",
    "content": {
      "id": "507f1f77bcf86cd799439015",
      "youtubeId": "4NRXx6U8ABQ",
      "title": "Blinding Lights",
      "artist": "The Weeknd",
      "duration": 200,
      "thumbnail": "https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg",
      "playCount": 1523
    }
  }
}
```

**Error Responses:**
- `404` - Share link not found or has expired
- `410` - Share link has expired
- `500` - Server error

---

### 4. Initialize Anonymous Session

**Endpoint:** `POST /api/share/:shareId/session`

**Authentication:** Not required (Public)

**Description:** Creates or retrieves an anonymous session for tracking song plays. Required for anonymous users to track their 3-song limit.

**Path Parameters:**
- `shareId` (string) - The unique share identifier

**Request Body:**
```json
{
  "existingSessionId": "optional-existing-session-id-32-chars"
}
```

**Response (New Session):**
```json
{
  "success": true,
  "data": {
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "playCount": 0,
    "canPlayMore": true,
    "hasReachedLimit": false
  }
}
```

**Response (Existing Session):**
```json
{
  "success": true,
  "data": {
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "playCount": 2,
    "canPlayMore": true,
    "hasReachedLimit": false
  }
}
```

**Error Responses:**
- `404` - Share link not found
- `500` - Server error

---

### 5. Track Anonymous Song Play

**Endpoint:** `POST /api/share/:shareId/play`

**Authentication:** Not required (Public)

**Description:** Tracks when an anonymous user plays a song. Enforces the 3-song limit. When limit is reached, returns an error with `requiresAuth: true`.

**Path Parameters:**
- `shareId` (string) - The unique share identifier

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "songId": "507f1f77bcf86cd799439015"
}
```

**Response (Play Allowed):**
```json
{
  "success": true,
  "data": {
    "playCount": 1,
    "canPlayMore": true,
    "hasReachedLimit": false,
    "remainingPlays": 2
  }
}
```

**Response (At Limit):**
```json
{
  "success": true,
  "data": {
    "playCount": 3,
    "canPlayMore": false,
    "hasReachedLimit": true,
    "remainingPlays": 0
  }
}
```

**Error Response (Limit Reached - Requires Account):**
```json
{
  "success": false,
  "error": "Play limit reached. Please create an account to continue listening.",
  "requiresAuth": true
}
```

**Error Responses:**
- `400` - Session ID and Song ID are required
- `403` - Play limit reached (with `requiresAuth: true`)
- `404` - Session not found
- `410` - Session has expired
- `500` - Server error

---

### 6. Check Session Status

**Endpoint:** `GET /api/share/:shareId/session/:sessionId`

**Authentication:** Not required (Public)

**Description:** Checks the current status of an anonymous session, including play count and remaining plays.

**Path Parameters:**
- `shareId` (string) - The unique share identifier
- `sessionId` (string) - The session identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "playCount": 2,
    "canPlayMore": true,
    "hasReachedLimit": false,
    "remainingPlays": 1,
    "songsPlayed": [
      "507f1f77bcf86cd799439015",
      "507f1f77bcf86cd799439016"
    ]
  }
}
```

**Error Responses:**
- `404` - Session not found
- `410` - Session has expired
- `500` - Server error

---

### 7. Delete Share Link

**Endpoint:** `DELETE /api/share/:shareId`

**Authentication:** Required (JWT Bearer token)

**Description:** Deactivates a share link (doesn't delete from database for analytics purposes). Only the owner can delete their shares.

**Path Parameters:**
- `shareId` (string) - The unique share identifier

**Response:**
```json
{
  "success": true,
  "message": "Share link deactivated successfully"
}
```

**Error Responses:**
- `401` - Authentication required
- `403` - You can only delete your own shares
- `404` - Share not found
- `500` - Server error

---

### 8. Get User's Shares

**Endpoint:** `GET /api/share/my/shares`

**Authentication:** Required (JWT Bearer token)

**Description:** Retrieves all active share links created by the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "shareId": "a1b2c3d4e5f6g7h8",
      "type": "playlist",
      "title": "My Awesome Playlist",
      "description": "The best songs collection",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "viewCount": 15,
      "playCount": 42,
      "playlist": {
        "id": "507f1f77bcf86cd799439013",
        "name": "My Awesome Playlist",
        "thumbnail": "https://example.com/thumbnail.jpg"
      },
      "createdAt": "2025-01-14T10:00:00.000Z",
      "updatedAt": "2025-01-14T12:30:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439014",
      "shareId": "x9y8z7w6v5u4t3s2",
      "type": "song",
      "title": "Blinding Lights",
      "description": "The Weeknd - Blinding Lights",
      "thumbnail": "https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg",
      "viewCount": 8,
      "playCount": 23,
      "song": {
        "id": "507f1f77bcf86cd799439015",
        "title": "Blinding Lights",
        "artist": "The Weeknd",
        "thumbnail": "https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg"
      },
      "createdAt": "2025-01-13T15:20:00.000Z",
      "updatedAt": "2025-01-14T09:15:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401` - Authentication required
- `500` - Server error

---

## Frontend Implementation Flow

### Sharing Flow (Authenticated User)

1. **Create Share Link**
   - User clicks "Share" button on a playlist or song
   - Frontend calls `POST /api/share/playlist/:playlistId` or `POST /api/share/song/:songId`
   - Display share URL to user with copy button

2. **View Shared Links**
   - User goes to "My Shares" page
   - Frontend calls `GET /api/share/my/shares`
   - Display all shares with analytics (views, plays)

3. **Delete Share**
   - User clicks "Delete" on a share
   - Frontend calls `DELETE /api/share/:shareId`
   - Remove from UI

### Receiving Share Flow (Anonymous User)

1. **Open Share Link**
   - Anonymous user opens `https://yourapp.com/share/:shareId`
   - Frontend calls `GET /api/share/:shareId` to get content
   - Display playlist or song content

2. **Initialize Session**
   - Check localStorage for existing sessionId
   - Call `POST /api/share/:shareId/session` with `existingSessionId` if available
   - Store returned `sessionId` in localStorage

3. **Play Song**
   - User clicks play on a song
   - Frontend calls `POST /api/share/:shareId/play` with `sessionId` and `songId`
   - Check response for `hasReachedLimit`
   - If limit reached, show signup modal

4. **Navigation Restriction**
   - If user tries to navigate away from share page (back button, menu, etc.)
   - Show signup modal: "Create an account to explore more"
   - Block navigation unless authenticated

5. **Check Session Status** (Optional)
   - Periodically or on page load, call `GET /api/share/:shareId/session/:sessionId`
   - Display remaining plays to user: "2 plays remaining"

### Song Share Special Case

When a song is shared:
1. User opens share link → sees expanded YouTube player with the song
2. User can click "back once" → sees the full playlist containing that song
3. Cannot navigate further without creating an account

---

## Database Models

### Share Model
```typescript
{
  shareId: string;          // Unique share identifier (16 chars hex)
  type: 'playlist' | 'song';
  owner: ObjectId;          // User who created the share
  playlist?: ObjectId;      // If type is 'playlist'
  song?: ObjectId;          // If type is 'song'
  title: string;            // Cached title
  description?: string;
  thumbnail?: string;
  viewCount: number;        // How many times link was viewed
  playCount: number;        // How many times content was played
  lastAccessedAt?: Date;
  isActive: boolean;        // For soft delete
  expiresAt?: Date;         // Optional expiration
  createdAt: Date;
  updatedAt: Date;
}
```

### AnonymousSession Model
```typescript
{
  sessionId: string;        // Unique session identifier (32 chars hex)
  shareId: string;          // Which share link they're accessing
  songsPlayed: string[];    // Array of song IDs played
  playCount: number;        // Total plays (max 3)
  ipAddress?: string;
  userAgent?: string;
  hasReachedLimit: boolean; // true when playCount >= 3
  expiresAt: Date;          // Auto-expires after 24 hours
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Important Notes

1. **Session Storage**: The frontend should store the `sessionId` in localStorage with the key pattern: `share_session_${shareId}`

2. **3-Song Limit**:
   - Enforced on the backend via `AnonymousSession.playCount`
   - Once a user reaches 3 plays, all subsequent play requests return 403 with `requiresAuth: true`
   - Show signup/login modal immediately

3. **Navigation Restriction**:
   - Frontend should detect navigation attempts (router guards, back button listener)
   - Show auth modal when anonymous user tries to leave share page
   - Allow authenticated users to navigate freely

4. **Session Expiration**:
   - Sessions expire after 24 hours automatically (MongoDB TTL index)
   - Expired sessions return 410 status code
   - Frontend should create new session if existing one expired

5. **Share URL Format**: `${FRONTEND_URL}/share/${shareId}`
   - Example: `https://nrgflow.com/share/a1b2c3d4e5f6g7h8`

6. **Analytics**:
   - Every view increments `Share.viewCount`
   - Every play increments both `Share.playCount` and `Song.playCount`

7. **Security**:
   - No authentication required for public share endpoints
   - Session IDs are stored client-side only
   - IP address and user agent stored for basic abuse prevention

---

## Testing the Implementation

### Test Creating a Share
```bash
# Create playlist share (requires auth)
curl -X POST http://localhost:4000/api/share/playlist/507f1f77bcf86cd799439013 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Anonymous Access
```bash
# Get shared content (no auth)
curl http://localhost:4000/api/share/a1b2c3d4e5f6g7h8

# Initialize session
curl -X POST http://localhost:4000/api/share/a1b2c3d4e5f6g7h8/session \
  -H "Content-Type: application/json" \
  -d '{}'

# Track play
curl -X POST http://localhost:4000/api/share/a1b2c3d4e5f6g7h8/play \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-id-here", "songId": "507f1f77bcf86cd799439015"}'
```
