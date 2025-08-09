# LyricFinder Deployment Guide

## Backend Deployment (Railway)

1. **Railway Setup:**
   - Connect your GitHub repository to Railway
   - Railway will automatically detect the Node.js backend in `/server`
   - The app will deploy with Node.js 20+ (required for compatibility)

2. **Environment Variables on Railway:**
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   PORT=3001
   GENIUS_ACCESS_TOKEN=your_genius_api_token
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   LASTFM_API_KEY=your_lastfm_api_key
   ```

3. **Railway Backend URL:**
   - Once deployed, Railway will provide a URL like: `https://your-app-name.railway.app`
   - Copy this URL for frontend configuration

## Frontend Deployment (Vercel)

1. **Vercel Setup:**
   - Import your GitHub repository to Vercel
   - Set the root directory to `client`
   - Vercel will automatically detect it's a React app

2. **Environment Variables on Vercel:**
   ```
   REACT_APP_API_URL=https://your-railway-backend-url.railway.app
   ```

3. **Deployment Steps:**
   - Push your code to GitHub (already done)
   - Connect to Vercel and set root directory to `client`
   - Add the environment variable with your Railway backend URL
   - Deploy!

## Quick Deployment Checklist

### ✅ Completed:
- [x] GitHub repository created and code pushed
- [x] Node.js compatibility fixed for Railway
- [x] API configuration centralized
- [x] Deployment configuration files created

### 🔄 Next Steps:
1. **Check Railway deployment status** - Go to Railway dashboard
2. **Get Railway backend URL** - Copy the deployed URL
3. **Deploy frontend to Vercel:**
   - Import GitHub repo
   - Set root directory: `client`
   - Add environment variable: `REACT_APP_API_URL` = Railway URL
   - Deploy

### 🔧 If Railway Deployment Fails:
- Check Railway build logs
- Ensure all environment variables are set
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check that Genius API token is valid

### 🎯 Final Result:
- **Backend:** `https://your-app.railway.app`
- **Frontend:** `https://your-app.vercel.app`
- **Full Stack App:** Ready to use!

## Performance Features Maintained:
- ✅ 20x faster search (100ms vs 2000ms delays)
- ✅ Smart caching system
- ✅ Error handling and loading states
- ✅ Responsive design
- ✅ Rate limiting protection
