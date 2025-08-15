# Troubleshooting Guide for LyricFinder Judge Feature

## Current Issue: "No routes matched location '/api/spotify/auth'"

This error occurs because the frontend is trying to navigate to a backend API route instead of calling it as an HTTP request.

## Root Cause
The frontend was configured to use relative URLs (`/api/spotify/auth`) which React Router tries to handle as frontend routes, but these are actually backend API endpoints.

## Solution Applied
✅ **Fixed**: Updated the frontend to use absolute URLs to the Railway backend
✅ **Fixed**: Removed proxy configuration that was causing conflicts
✅ **Fixed**: Updated environment variable examples

## Required Environment Variables

### Backend (Railway)
Set these environment variables in your Railway dashboard:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=https://lyricfinder-production.up.railway.app/api/spotify/callback
FRONTEND_URL=https://lyric-finder-alpha.vercel.app
COOKIE_DOMAIN=.railway.app
SERVER_BASE_URL=https://lyricfinder-production.up.railway.app
```

### Frontend (Vercel)
Create a `.env` file in the client directory (optional):

```bash
REACT_APP_API_URL=https://lyricfinder-production.up.railway.app
```

## Spotify App Configuration

In your Spotify Developer Dashboard, set the redirect URI to:
```
https://lyricfinder-production.up.railway.app/api/spotify/callback
```

## Testing Steps

1. **Deploy the updated backend code to Railway**
2. **Deploy the updated frontend code to Vercel**
3. **Test the flow:**
   - Go to `https://lyric-finder-alpha.vercel.app/judge`
   - Click "Connect Spotify"
   - Should redirect to Spotify for authorization
   - After authorization, should redirect back to `/judge`

## Debug Information

### Frontend Console Logs
The updated code now includes comprehensive logging:
- API endpoint URLs being called
- Response status codes
- Error details

### Backend Logs
Check Railway logs for:
- Spotify API authentication errors
- CORS issues
- Environment variable problems

## Common Issues & Solutions

### Issue 1: CORS Errors
**Symptoms**: Browser console shows CORS errors
**Solution**: Backend CORS is configured to allow Vercel domains

### Issue 2: Spotify Authentication Fails
**Symptoms**: "Spotify credentials not configured" error
**Solution**: Verify all environment variables are set in Railway

### Issue 3: Redirect Loop
**Symptoms**: Page keeps redirecting
**Solution**: Check that `FRONTEND_URL` matches your Vercel domain exactly

### Issue 4: Cookies Not Set
**Symptoms**: Authentication state not persisting
**Solution**: Verify `COOKIE_DOMAIN` is set to `.railway.app`

## API Endpoints

The frontend now calls these backend endpoints:
- `https://lyricfinder-production.up.railway.app/api/spotify/auth`
- `https://lyricfinder-production.up.railway.app/api/spotify/me`
- `https://lyricfinder-production.up.railway.app/api/spotify/me/top-tracks`
- `https://lyricfinder-production.up.railway.app/api/spotify/audio-features-batch`
- `https://lyricfinder-production.up.railway.app/api/spotify/artists`

## Verification Checklist

- [ ] Backend deployed to Railway with all environment variables
- [ ] Frontend deployed to Vercel with updated code
- [ ] Spotify app redirect URI matches Railway callback URL
- [ ] No CORS errors in browser console
- [ ] OAuth flow completes successfully
- [ ] Top tracks load without errors
- [ ] Analysis runs successfully

## Still Having Issues?

1. Check the browser console for detailed error logs
2. Verify Railway backend is accessible: `https://lyricfinder-production.up.railway.app/api/spotify/me`
3. Check Railway logs for backend errors
4. Ensure all environment variables are set correctly
5. Verify Spotify app settings match your deployment URLs
