# Playlist & Favorites API Documentation

## Overview
All playlist and favorites endpoints are fully implemented and ready to use.

---

## ✅ Required Endpoints (All Implemented)

### 1. Add Song to Playlist

**Endpoint**: `POST /api/playlists/:id/songs`

**Authentication**: Required

**Request Body**:
```json
{
  "songId": "E_0y8bmIATM"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Song added to playlist",
    "playlistId": "507f1f77bcf86cd799439011",
    "songId": "E_0y8bmIATM"
  }
}
```

**Error Responses**:
- `401` - Authentication required
- `404` - Playlist or song not found
- `403` - Permission denied (user doesn't own or can't edit playlist)

---

### 2. Add Song to Favorites

**Endpoint**: `POST /api/users/library/favorites`

**Authentication**: Required

**Request Body**:
```json
{
  "songId": "E_0y8bmIATM"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Song added to favorites"
  }
}
```

**How It Works**:
- Finds or creates a user library
- Adds song to the user's favorite songs list
- Prevents duplicates automatically

**Error Responses**:
- `401` - User not authenticated
- `400` - Song ID is required

---

### 3. Get User Playlists

**Endpoint**: `GET /api/playlists`

**Alternative Endpoints** (same functionality):
- `GET /api/playlists/my`
- `GET /api/playlists/user`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "playlists": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "My Favorites",
        "description": "My favorite songs",
        "owner": "507f191e810c19729de860ea",
        "isPublic": false,
        "isCollaborative": false,
        "songs": [
          {
            "_id": "507f1f77bcf86cd799439012",
            "youtubeId": "E_0y8bmIATM",
            "title": "Song Title",
            "artist": "Artist Name",
            "duration": 240,
            "thumbnail": "https://..."
          }
        ],
        "songCount": 15,
        "playCount": 42,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-15T00:00:00.000Z"
      }
    ],
    "total": 5
  }
}
```

**Returns**:
- All playlists owned by the authenticated user
- All playlists where user is a collaborator
- Sorted by most recently updated first

---

### 4. Create Playlist

**Endpoint**: `POST /api/playlists`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Road Trip Mix",
  "description": "Songs for long drives",
  "isPublic": false,
  "isCollaborative": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Road Trip Mix",
    "description": "Songs for long drives",
    "owner": "507f191e810c19729de860ea",
    "isPublic": false,
    "isCollaborative": false,
    "songs": [],
    "songCount": 0,
    "playCount": 0,
    "followers": [],
    "collaborators": [],
    "tags": [],
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

**Validation**:
- `name` - Required, 1-100 characters
- `description` - Optional, max 500 characters
- `isPublic` - Optional, default: false
- `isCollaborative` - Optional, default: false

---

## Additional Endpoints

### 5. Get Specific Playlist

**Endpoint**: `GET /api/playlists/:id`

**Authentication**: Optional (required for private playlists)

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "My Playlist",
    "songs": [...],
    "owner": {
      "_id": "507f191e810c19729de860ea",
      "username": "john_doe",
      "email": "john@example.com"
    },
    ...
  }
}
```

---

### 6. Remove Song from Playlist

**Endpoint**: `DELETE /api/playlists/:id/songs/:songId`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Song removed from playlist",
    "playlistId": "507f1f77bcf86cd799439011",
    "songId": "E_0y8bmIATM"
  }
}
```

---

### 7. Update Playlist

**Endpoint**: `PUT /api/playlists/:id`

**Authentication**: Required

**Request Body** (all fields optional):
```json
{
  "name": "New Name",
  "description": "New description",
  "isPublic": true,
  "tags": ["rock", "indie"]
}
```

---

### 8. Delete Playlist

**Endpoint**: `DELETE /api/playlists/:id`

**Authentication**: Required (must be owner)

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Playlist deleted successfully"
  }
}
```

---

### 9. Reorder Songs in Playlist

**Endpoint**: `PUT /api/playlists/:id/reorder`

**Authentication**: Required

**Request Body**:
```json
{
  "songIds": ["E_0y8bmIATM", "dQw4w9WgXcQ", "jNQXAC9IVRw"]
}
```

---

### 10. Get Favorites

**Endpoint**: `GET /api/users/library/favorites`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "songs": [
      {
        "youtubeId": "E_0y8bmIATM",
        "title": "Song Title",
        "artist": "Artist Name",
        ...
      }
    ],
    "total": 25
  }
}
```

---

### 11. Remove from Favorites

**Endpoint**: `DELETE /api/users/library/favorites`

**Authentication**: Required

**Request Body**:
```json
{
  "songId": "E_0y8bmIATM"
}
```

---

## Frontend Service Mapping

Your frontend calls these methods which map to:

```typescript
// Frontend Method → Backend Endpoint

musicService.addSongToPlaylist(playlistId, songId)
→ POST /api/playlists/:id/songs
  Body: { songId: "..." }

musicService.addToFavorites(songId)
→ POST /api/users/library/favorites
  Body: { songId: "..." }

musicService.getUserPlaylists()
→ GET /api/playlists

musicService.createPlaylist(data)
→ POST /api/playlists
  Body: { name, description?, isPublic? }
```

---

## Testing with curl

### Create a Playlist
```bash
curl -X POST http://localhost:5003/api/playlists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Playlist",
    "description": "Created via API"
  }'
```

### Get User Playlists
```bash
curl http://localhost:5003/api/playlists \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Add Song to Playlist
```bash
curl -X POST http://localhost:5003/api/playlists/PLAYLIST_ID/songs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "songId": "E_0y8bmIATM"
  }'
```

### Add to Favorites
```bash
curl -X POST http://localhost:5003/api/users/library/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "songId": "E_0y8bmIATM"
  }'
```

---

## Rate Limiting

All playlist mutation endpoints have rate limiting:

```javascript
playlistRateLimit: {
  windowMs: 60000,      // 1 minute
  max: 30,              // 30 requests per minute
  message: "Too many playlist requests"
}
```

**Read endpoints (GET)** have no rate limit.

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `201` - Created (for POST that creates resources)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but no permission)
- `404` - Not Found
- `500` - Internal Server Error

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get token by:
1. Register: `POST /api/users/register`
2. Login: `POST /api/users/login`

Both return:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI...",
    "user": { ... }
  }
}
```

---

## Summary

✅ **All 4 required endpoints are implemented and working**

1. `POST /api/playlists/:id/songs` - Add song to playlist
2. `POST /api/users/library/favorites` - Add to favorites
3. `GET /api/playlists` - Get user playlists
4. `POST /api/playlists` - Create playlist

Plus **7 bonus endpoints** for complete playlist management.

**Total**: 11 fully functional playlist/favorites endpoints ready to use!
