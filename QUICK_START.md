# 🚀 Quick Deployment Guide for LyricFinder

This is the fastest way to deploy your LyricFinder app to the web for free!

## 📋 Prerequisites Checklist

Before you start, make sure you have:
- [ ] A GitHub account
- [ ] Your project code ready
- [ ] MongoDB Atlas account (free)
- [ ] Genius API key (free)

## 🎯 Step-by-Step Deployment

### Step 1: Setup Git Repository

```bash
# Initialize git repository
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: LyricFinder MERN app"

# Create repository on GitHub and connect
git remote add origin https://github.com/your-username/lyricfinder.git
git branch -M main
git push -u origin main
```

### Step 2: Setup MongoDB Database

1. **Go to [MongoDB Atlas](https://mongodb.com/atlas)**
2. **Create a free account** (if you don't have one)
3. **Create a new cluster** (free tier is fine)
4. **Create a database user**:
   - Go to Database Access
   - Add New Database User
   - Username: `lyricfinder_user`
   - Password: `generate a strong password`
   - Built-in Role: `Read and write to any database`

5. **Get connection string**:
   - Go to Database → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

### Step 3: Deploy Backend to Render

1. **Go to [Render.com](https://render.com)**
2. **Sign up** with your GitHub account
3. **Create a new Web Service**:
   - Connect your GitHub repository
   - **Name**: `lyricfinder-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Auto-Deploy**: `Yes`

4. **Add Environment Variables**:
   ```
   PORT=10000
   MONGODB_URI=mongodb+srv://lyricfinder_user:your_password@cluster.mongodb.net/lyricfinder
   GENIUS_API_KEY=your_genius_api_key_here
   NODE_ENV=production
   ```

5. **Deploy** - Wait for deployment to complete (5-10 minutes)
6. **Copy your backend URL** (e.g., `https://lyricfinder-backend.onrender.com`)

### Step 4: Deploy Frontend to Netlify

1. **Go to [Netlify.com](https://netlify.com)**
2. **Sign up** with your GitHub account
3. **Import from Git**:
   - Choose your GitHub repository
   - **Build settings**:
     - Base directory: `client`
     - Build command: `npm run build`
     - Publish directory: `client/build`

4. **Add Environment Variables**:
   - Go to Site settings → Environment variables
   - Add: `REACT_APP_API_URL` = `https://your-render-backend-url.onrender.com`

5. **Update netlify.toml**:
   - Edit the `netlify.toml` file in your project root
   - Replace `your-render-app-name` with your actual Render app name
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://lyricfinder-backend.onrender.com/api/:splat"
     status = 200
     force = true
   ```

6. **Deploy** - Your site will be available at a Netlify URL

### Step 5: Get Your API Keys

#### Genius API Key (Required)
1. **Go to [Genius Developers](https://genius.com/developers)**
2. **Sign up** and create a new API client
3. **Get your Client Access Token**
4. **Add it to Render environment variables**

#### Spotify API (Optional but recommended)
1. **Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)**
2. **Create a new app**
3. **Get Client ID and Client Secret**
4. **Add redirect URI**: `https://your-netlify-url.netlify.app/callback`

### Step 6: Update CORS Settings

Update your backend CORS settings in `server/server.js`:
```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-netlify-url.netlify.app'  // Add your actual Netlify URL
  ],
  credentials: true
};
```

Commit and push changes:
```bash
git add .
git commit -m "Update CORS for production"
git push
```

## ✅ Final Checklist

After deployment, test these features:
- [ ] Website loads properly
- [ ] Search functionality works
- [ ] Lyrics display correctly
- [ ] Spotify integration works (if configured)
- [ ] Mobile responsiveness
- [ ] No console errors

## 🔗 Your Live URLs

After successful deployment:
- **Frontend**: `https://your-app-name.netlify.app`
- **Backend**: `https://your-app-name.onrender.com`

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution**: Check your MongoDB Atlas connection string and make sure your IP is whitelisted (use 0.0.0.0/0 for all IPs)

### Issue: "CORS error"
**Solution**: Make sure your Netlify URL is added to the CORS origins in your backend

### Issue: "Build fails on Netlify"
**Solution**: Check that your build command is correct and all dependencies are in package.json

### Issue: "API calls failing"
**Solution**: Verify your REACT_APP_API_URL environment variable is set correctly

## 🎉 Congratulations!

Your LyricFinder app is now live! Share your creation with friends and add the URLs to your portfolio.

## 📞 Need Help?

If you encounter any issues:
1. Check the deployment logs in Render and Netlify
2. Verify all environment variables are set correctly
3. Make sure your API keys are valid
4. Check the browser console for errors

---

**Happy deploying! 🚀**
- No search count tracking
- No popular songs list
- Each search makes a new API call

## Current Features (Working)
✅ Real lyrics search via APIs  
✅ Beautiful React UI  
✅ Responsive design  
✅ Error handling  
✅ Multiple API fallbacks  
