# LyricFinder - MERN Stack Application

A modern web application that finds song lyrics using AI technology. Built with the MERN stack (MongoDB, Express.js, React.js, Node.js).

## Features

- 🎵 **Real Lyrics Search**: Integration with Genius API for accurate lyrics fetching
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- 🔍 **Smart Caching**: Saves searched lyrics to avoid duplicate API requests
- 📊 **Popular Songs**: Track and display most searched songs
- ⚡ **Fast Performance**: Optimized for quick search results with fallback APIs
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- 🛡️ **Multiple Sources**: Falls back to alternative APIs if primary source fails

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database for storing songs and lyrics
- **Mongoose** - MongoDB object modeling
- **Axios** - HTTP client for external API calls
- **Cheerio** - Server-side HTML parsing for web scraping
- **Genius API** - Primary lyrics data source
- **Lyrics.ovh API** - Fallback lyrics source
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - API rate limiting

### Frontend
- **React.js** - User interface library
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Lucide React** - Modern icon library
- **CSS3** - Styling with gradients and animations

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LyricFinder
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install server dependencies**
   ```bash
   npm run install-server
   ```

4. **Install client dependencies**
   ```bash
   npm run install-client
   ```

5. **Set up environment variables**
   ```bash
   cd server
   cp .env.example .env
   ```
   Update the `.env` file with your MongoDB connection string and API keys.

6. **Start MongoDB**
   Make sure MongoDB is running on your local machine or update the connection string for MongoDB Atlas.

### Running the Application

#### Development Mode (Recommended)
Run both frontend and backend concurrently:
```bash
npm run dev
```

#### Individual Services
**Start the backend server:**
```bash
npm run server
```

**Start the frontend client:**
```bash
npm run client
```

#### Production Build
```bash
npm run build
npm start
```

### Default Ports
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Documentation

### Lyrics Endpoints

#### Search for Lyrics
```
POST /api/lyrics/search
Content-Type: application/json

{
  "title": "Song Title",
  "artist": "Artist Name"
}
```

#### Get Popular Songs
```
GET /api/lyrics/popular
```

### Songs Endpoints

#### Get All Songs
```
GET /api/songs?page=1&limit=10
```

#### Search Songs
```
GET /api/songs/search?q=search_query
```

#### Get Song by ID
```
GET /api/songs/:id
```

## Project Structure

```
LyricFinder/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── Header.js
│   │   │   ├── SearchForm.js
│   │   │   └── SongCard.js
│   │   ├── pages/          # Page components
│   │   │   ├── Home.js
│   │   │   ├── SongDetail.js
│   │   │   ├── PopularSongs.js
│   │   │   └── SearchResults.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── server/                 # Node.js backend
│   ├── models/
│   │   └── Song.js         # MongoDB schema
│   ├── routes/
│   │   ├── songs.js        # Song routes
│   │   └── lyrics.js       # Lyrics routes
│   ├── server.js           # Main server file
│   ├── .env.example        # Environment variables template
│   └── package.json
├── .github/
│   └── copilot-instructions.md
├── package.json            # Root package.json
└── README.md
```

## Key Features Explained

### Real Lyrics Search Integration
The application now features real lyrics search capabilities:
- **Primary Source**: Genius API with web scraping for comprehensive lyrics
- **Fallback Source**: Lyrics.ovh API for additional coverage
- **Error Handling**: Graceful fallbacks when APIs are unavailable
- **Rate Limiting**: Respects API limits and implements proper delays
- **Data Accuracy**: Real lyrics from verified music databases

### Smart Caching System
- Searches are cached in MongoDB to avoid duplicate API calls
- Popular songs are tracked by search count
- Database indexing for fast text searches

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly interface
- Smooth animations and transitions

## Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lyricfinder

# Genius API Configuration (Required for lyrics search)
GENIUS_API_KEY=your_genius_api_key_here

# Optional API Keys (for future enhancements)
OPENAI_API_KEY=your_openai_api_key_here
LYRICFIND_API_KEY=your_lyricfind_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

### Getting Your Genius API Key (Required)

To enable real lyrics search functionality, you need to get a free Genius API key:

1. **Visit Genius Developers**: Go to [https://genius.com/developers](https://genius.com/developers)
2. **Sign Up/Login**: Create a Genius account or log in if you already have one
3. **Create API Client**: 
   - Click "Create API Client" 
   - Fill in the required information:
     - App Name: "LyricFinder" (or any name you prefer)
     - App Website URL: "http://localhost:3000" (for development)
     - Redirect URI: "http://localhost:3000" (for development)
4. **Get Your Access Token**: After creating the client, you'll receive an access token
5. **Update .env**: Copy the access token and paste it as the value for `GENIUS_API_KEY` in your `.env` file

**Note**: Without the Genius API key, the application will fall back to a free alternative API (lyrics.ovh) which has limited song coverage.

## Security Features

- **Helmet.js**: Secures Express apps by setting various HTTP headers
- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Validates and sanitizes user inputs
- **Environment Variables**: Sensitive data stored securely

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Lucide React for beautiful icons
- MongoDB for robust data storage
- React community for excellent documentation
- Express.js for the powerful web framework

## Future Enhancements

- [ ] User authentication and favorites
- [ ] Playlist creation and management
- [ ] Social sharing features
- [ ] Real-time lyrics synchronization
- [ ] Multi-language support
- [ ] Advanced search filters
- [ ] Integration with music streaming services
- [ ] Offline lyrics caching

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
