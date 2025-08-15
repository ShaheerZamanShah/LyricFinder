# 🎵 LyricFinder - AI-Powered Lyrics Search

A modern MERN stack application that helps users discover song lyrics with AI-powered search, Spotify integration, and beautiful UI.

![LyricFinder Preview](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=LyricFinder+Preview)

## ✨ Features

- 🔍 **AI-Powered Search**: Find lyrics instantly using the Genius API
- 🎵 **Spotify Integration**: Get song recommendations and previews
- 🎨 **Beautiful UI**: Modern design with smooth animations and themes
- 📱 **Responsive**: Works perfectly on desktop, tablet, and mobile
- ⚡ **Fast Performance**: Optimized for speed with smart caching
- 🌙 **Dark/Light Themes**: Multiple theme options for better user experience

## 🚀 Live Demo

- **Frontend**: [your-netlify-url.netlify.app](https://your-netlify-url.netlify.app)
- **Backend API**: [your-render-url.onrender.com](https://your-render-url.onrender.com)

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling

### APIs & Services
- **Genius API** - Lyrics data
- **Spotify Web API** - Music recommendations and previews
- **Last.fm API** - Artist information

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- MongoDB Atlas account (free)
- Genius API key (free)
- Spotify API credentials (free)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/lyricfinder.git
cd lyricfinder
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm run install-all

# Or install individually
npm run install-server
npm run install-client
```

### 3. Environment Setup

Create `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lyricfinder
GENIUS_API_KEY=your_genius_api_key_here
NODE_ENV=development
```

### 4. Get API Keys

#### Genius API
1. Visit [genius.com/developers](https://genius.com/developers)
2. Create a new API client
3. Copy the Client Access Token

#### Spotify API (Optional)
1. Visit [developer.spotify.com](https://developer.spotify.com)
2. Create a new app
3. Get Client ID and Client Secret

#### MongoDB Atlas
1. Visit [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a free cluster
3. Get connection string

### 5. Run Development
```bash
# Run both frontend and backend
npm run dev

# Or run separately
npm run server  # Backend on port 5000
npm run client  # Frontend on port 3000
```

## 🌐 Deployment

### Option 1: Netlify + Render (Recommended)

#### Backend (Render)
1. Create account at [render.com](https://render.com)
2. Connect your GitHub repository
3. Create a new Web Service:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node

4. Add environment variables:
```env
PORT=10000
MONGODB_URI=your_mongodb_connection_string
GENIUS_API_KEY=your_genius_api_key
NODE_ENV=production
```

#### Frontend (Netlify)
1. Create account at [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/build`

4. Add environment variable:
```env
REACT_APP_API_URL=https://your-render-app-name.onrender.com
```

5. Update `netlify.toml` with your Render URL:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-render-app-name.onrender.com/api/:splat"
  status = 200
  force = true
```

### Option 2: Vercel + Railway

#### Backend (Railway)
1. Visit [railway.app](https://railway.app)
2. Deploy from GitHub
3. Add environment variables

#### Frontend (Vercel)
1. Visit [vercel.com](https://vercel.com)
2. Import from GitHub
3. Configure build settings

## 📁 Project Structure

```
lyricfinder/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── contexts/       # React contexts
│   │   ├── config/         # Configuration files
│   │   └── api/           # API utilities
│   └── package.json
├── server/                 # Express backend
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── cache.js           # Caching system
│   └── server.js          # Entry point
├── netlify.toml           # Netlify configuration
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md             # This file
```

## 🔧 Configuration

### Frontend API Configuration
Update `client/src/config/api.js`:
```javascript
const API_CONFIG = {
  development: {
    BASE_URL: 'http://localhost:5000',
  },
  production: {
    BASE_URL: process.env.REACT_APP_API_URL || 'https://your-backend-url.com',
  }
};
```

### Backend CORS Configuration
Update allowed origins in `server/server.js`:
```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-netlify-url.netlify.app'
  ],
  credentials: true
};
```

## 🎯 Performance Optimizations

- ⚡ Smart caching system for lyrics and API responses
- 🔄 Background recommendation loading
- 📱 Optimized mobile experience
- 🎨 Lazy loading for images and components
- 💾 Local storage for user preferences

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Genius API](https://docs.genius.com/) for lyrics data
- [Spotify Web API](https://developer.spotify.com/) for music recommendations
- [Last.fm API](https://www.last.fm/api) for artist information
- [Tailwind CSS](https://tailwindcss.com/) for the amazing utility classes
- [Lucide](https://lucide.dev/) for beautiful icons

## 📞 Support

If you have any questions or need help with deployment, please [open an issue](https://github.com/your-username/lyricfinder/issues) or contact me at your-email@example.com.

---

**Happy coding! 🎵**
