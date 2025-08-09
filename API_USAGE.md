# API Usage Examples

This document shows how to use the updated LyricFinder API with real lyrics integration.

## Setting Up Genius API

1. Visit https://genius.com/developers
2. Create a new API client
3. Copy your access token
4. Add it to your `.env` file:
   ```
   GENIUS_API_KEY=your_actual_genius_access_token_here
   ```

## Testing the API

### Without Genius API Key (Fallback to lyrics.ovh)
The application will automatically use the free lyrics.ovh API if no Genius key is provided.

### With Genius API Key
You'll get more accurate lyrics from Genius with better song matching.

## Example API Calls

### Search for Lyrics
```bash
curl -X POST http://localhost:5000/api/lyrics/search \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bohemian Rhapsody",
    "artist": "Queen"
  }'
```

### Expected Response
```json
{
  "song": {
    "_id": "...",
    "title": "Bohemian Rhapsody",
    "artist": "Queen",
    "lyrics": "[Verse 1]\nIs this the real life?\nIs this just fantasy?...",
    "source": "Genius API",
    "searchCount": 1,
    "createdAt": "2025-08-07T...",
    "updatedAt": "2025-08-07T..."
  },
  "cached": false,
  "confidence": 0.95
}
```

## Features

### Multiple Data Sources
1. **Primary**: Genius API (requires API key)
2. **Fallback**: lyrics.ovh API (free, no auth)
3. **Cache**: MongoDB (prevents duplicate API calls)

### Error Handling
- Invalid API keys → Falls back to alternative source
- Song not found → Returns helpful error message
- Network issues → Graceful error handling
- Rate limiting → Respects API limits

### Smart Caching
- Songs are cached after first search
- Subsequent searches return cached results
- Search count is tracked for popularity ranking

## Popular Songs Endpoint
```bash
curl http://localhost:5000/api/lyrics/popular
```

Returns the most searched songs with their search counts.

## Frontend Integration

The React frontend automatically handles:
- Loading states during API calls
- Error display for failed searches
- Caching indicators (shows if lyrics were cached or newly fetched)
- Responsive design for all devices

## Production Deployment Notes

1. **Environment Variables**: Set up all required environment variables
2. **MongoDB**: Use MongoDB Atlas or a production MongoDB instance
3. **Rate Limiting**: The API includes rate limiting (100 requests per 15 minutes)
4. **CORS**: Configured for cross-origin requests
5. **Security**: Helmet.js provides security headers
