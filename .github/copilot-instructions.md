<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a MERN stack application for finding song lyrics using AI technology.

## Project Structure
- **Backend**: Node.js + Express.js API server with MongoDB integration
- **Frontend**: React.js application with modern UI components
- **AI Integration**: Lyrics search functionality with web scraping capabilities

## Key Technologies
- MongoDB for data persistence
- Express.js for REST API
- React.js with React Router for frontend
- Axios for HTTP requests
- Lucide React for icons
- AI-powered lyrics search simulation

## Development Guidelines
- Use modern ES6+ JavaScript syntax
- Follow React functional components with hooks
- Implement proper error handling and loading states
- Use responsive design principles
- Include proper CORS configuration
- Implement rate limiting for API endpoints

## API Endpoints
- POST /api/lyrics/search - Search for lyrics using AI
- GET /api/lyrics/popular - Get most searched songs
- GET /api/songs - Get all songs with pagination
- GET /api/songs/search - Search existing songs
- GET /api/songs/:id - Get specific song details

## Security Considerations
- Use environment variables for sensitive data
- Implement rate limiting
- Use Helmet.js for security headers
- Validate input data properly
