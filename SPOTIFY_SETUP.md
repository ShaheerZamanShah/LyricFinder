# Spotify Integration Setup Guide

## Overview
This guide will help you set up the Spotify integration for the LyricFinder app, specifically fixing the Judge feature that analyzes user music taste.

## Prerequisites
1. A Spotify Developer account
2. A deployed backend server (Railway, Heroku, etc.)
3. A deployed frontend (Vercel, Netlify, etc.)

## Step 1: Spotify App Setup

### 1.1 Create Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in the details:
   - App name: `LyricFinder`
   - App description: `AI-powered music lyrics and taste analysis`
   - Website: Your frontend URL (e.g., `https://lyric-finder-alpha.vercel.app`)
   - Redirect URI: `https://your-backend-domain.com/api/spotify/callback`
   - API/SDKs: Web API

### 1.2 Get Credentials
After creating the app, you'll get:
- Client ID
- Client Secret

## Step 2: Backend Environment Variables

Set these environment variables on your backend server:

```bash
# Required
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=https://your-backend-domain.com/api/spotify/callback

# Frontend URL for OAuth redirects
FRONTEND_URL=https://lyric-finder-alpha.vercel.app

# Optional: Cookie domain for cross-subdomain cookies
COOKIE_DOMAIN=.yourdomain.com
```

## Step 3: Frontend Configuration

The frontend is already configured to use relative URLs for the Judge feature:
- `/api/spotify/auth` - Starts OAuth flow
- `/api/spotify/me` - Gets user profile
- `/api/spotify/me/top-tracks` - Gets user's top tracks
- `/api/spotify/audio-features-batch` - Gets audio features for analysis
- `/api/spotify/artists` - Gets artist information

## Step 4: Testing the Integration

### 4.1 Test OAuth Flow
1. Go to your deployed frontend: `/judge`
2. Click "Connect Spotify"
3. You should be redirected to Spotify for authorization
4. After authorization, you should be redirected back to `/judge`

### 4.2 Test Top Tracks
1. After connecting, click "Load your top tracks"
2. Your top tracks should appear in the list

### 4.3 Test Analysis
1. Click "Analyze taste"
2. You should see analysis results including:
   - Audio features (danceability, energy, valence, etc.)
   - Top genres
   - AI-generated verdict

## Step 5: Troubleshooting

### Common Issues

#### 1. "Could not load your top tracks" Error
**Cause**: Backend server not accessible or Spotify credentials missing
**Solution**: 
- Check backend server is running
- Verify environment variables are set
- Check CORS configuration

#### 2. OAuth Redirect Issues
**Cause**: Incorrect redirect URI or CORS problems
**Solution**:
- Ensure redirect URI matches exactly in Spotify app settings
- Check CORS configuration allows your frontend domain
- Verify cookies are being set properly

#### 3. CORS Errors
**Cause**: Frontend and backend on different domains
**Solution**:
- Backend CORS is configured to allow Vercel domains
- Ensure `FRONTEND_URL` environment variable is set correctly

#### 4. Cookie Issues
**Cause**: Cross-origin cookies not being set properly
**Solution**:
- Cookies are set with `SameSite=None` and `Secure=true`
- Ensure backend uses HTTPS in production
- Check `COOKIE_DOMAIN` if using subdomains

### Debug Steps

1. **Check Browser Console**: Look for CORS or network errors
2. **Check Network Tab**: Verify API calls are being made
3. **Check Backend Logs**: Look for authentication or API errors
4. **Verify Environment Variables**: Ensure all required variables are set

## Step 6: Production Deployment

### Backend (Railway)
1. Set all environment variables in Railway dashboard
2. Deploy the updated server code
3. Verify the server is accessible

### Frontend (Vercel)
1. The frontend is already configured for production
2. Deploy any updates
3. Test the complete flow

## Security Considerations

1. **Client Secret**: Never expose in frontend code
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Restrict to known domains only
4. **Rate Limiting**: Backend includes rate limiting
5. **Cookies**: Use secure, httpOnly cookies

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/spotify/auth` | GET | Start OAuth flow |
| `/api/spotify/callback` | GET | OAuth callback |
| `/api/spotify/me` | GET | Get user profile |
| `/api/spotify/me/top-tracks` | GET | Get user's top tracks |
| `/api/spotify/audio-features-batch` | GET | Get audio features for multiple tracks |
| `/api/spotify/artists` | GET | Get artist information |

## Support

If you continue to have issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure both frontend and backend are deployed and accessible
4. Check that Spotify app settings match your deployment URLs
