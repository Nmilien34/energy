#!/bin/bash

# Test script to verify playlist API works
# Make sure backend is running first!

echo "Testing Playlist API..."
echo "======================="

# First, login to get a token
echo -e "\n1. Attempting to create playlist (requires auth token)..."
echo "   Note: You need to be logged in with a valid token"
echo ""

# Get your token from localStorage or cookies and set it here
# TOKEN="your-jwt-token-here"

# Test creating a playlist
# curl -X POST http://localhost:5000/api/playlists \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer $TOKEN" \
#   -d '{
#     "name": "Test Playlist via cURL",
#     "description": "Testing playlist creation",
#     "isPublic": false,
#     "isCollaborative": false
#   }'

echo "To test manually:"
echo "1. Make sure backend is running (npm run dev)"
echo "2. Open browser DevTools (F12)"
echo "3. Go to Console tab"
echo "4. Run this command:"
echo ""
echo "fetch('http://localhost:5000/api/playlists', {"
echo "  method: 'POST',"
echo "  headers: {"
echo "    'Content-Type': 'application/json',"
echo "    'Authorization': 'Bearer ' + localStorage.getItem('token')"
echo "  },"
echo "  body: JSON.stringify({"
echo "    name: 'Test Playlist',"
echo "    description: 'Testing',"
echo "    isPublic: false"
echo "  })"
echo "}).then(r => r.json()).then(console.log)"

