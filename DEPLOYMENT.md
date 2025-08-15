# LyricFinder Deployment Guide

## Deployment Setup

This application uses a split deployment approach:
- **Frontend (React)**: Deployed to Netlify
- **Backend (Node.js/Express)**: Deployed to Render

## Backend Deployment (Render)

1. Create account at [render.com](https://render.com)
2. Connect your GitHub repository
3. Create a new Web Service
4. Configure the service:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node
   - **Region**: Choose closest to your users

### Environment Variables for Render:
```
PORT=10000
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/lyricfinder
GENIUS_API_KEY=your_genius_api_key_here
NODE_ENV=production
```

## Frontend Deployment (Netlify)

1. Create account at [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/build`

### Environment Variables for Netlify:
```
REACT_APP_API_URL=https://your-render-app-name.onrender.com
```

## Database Setup (MongoDB Atlas)

1. Create account at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Create database user and get connection string
4. Add connection string to Render environment variables

## API Keys Required

1. **Genius API Key**: Get from [genius.com/developers](https://genius.com/developers)
2. **Spotify API Keys** (if using): Get from [developer.spotify.com](https://developer.spotify.com)

## Domain Configuration

After deployment:
1. Update CORS settings in backend to allow your Netlify domain
2. Update API URLs in frontend to point to your Render backend
3. Configure custom domain if desired

## Security Checklist

- [ ] All sensitive data in environment variables
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Database connection secured
- [ ] API keys secured

## Monitoring

- Monitor backend logs in Render dashboard
- Monitor frontend deploys in Netlify dashboard
- Set up error tracking (optional: Sentry)
