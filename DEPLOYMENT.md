# Deployment Guide for Pi Dashboard

## Vercel Deployment

### Issue Fixed
The app was not loading on Vercel because:
1. **Hardcoded local IP addresses** - The frontend was trying to connect to `192.168.0.32:3001`
2. **Missing serverless functions** - The backend API wasn't deployed as Vercel functions
3. **Hardware-specific APIs** - Raspberry Pi system commands don't work on Vercel

### Solution Implemented

1. **Created dynamic API configuration** (`src/config/api.js`)
   - Automatically uses relative URLs in production
   - Falls back to local IP for development

2. **Added Vercel serverless functions** (`api/` directory)
   - `api/system-status.js` - Returns mock system data
   - `api/chat.js` - Handles AI chat (requires OPENAI_API_KEY)
   - `api/crawler.js` - Placeholder for crawler functionality

3. **Updated frontend components**
   - App.jsx and SidePanel.jsx now use the API configuration
   - Removed hardcoded IP addresses

### Environment Variables Required

Set these in Vercel's dashboard (Settings → Environment Variables):
- `OPENAI_API_KEY` - Your OpenAI API key for chat functionality

### Local Development

1. Copy `.env.example` to `.env.local`
2. Add your OpenAI API key
3. Run the local backend: `npm run server`
4. Run the frontend: `npm run dev`

### Deployment Steps

1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Fix Vercel deployment with serverless functions"
   git push
   ```

2. Vercel will automatically redeploy

3. Add environment variables in Vercel dashboard

### Limitations on Vercel

Since Vercel doesn't have access to Raspberry Pi hardware, the following features show mock data:
- CPU temperature and usage
- Memory statistics
- Battery status (if using PiJuice)
- Network statistics
- System processes

For full functionality, run the app locally on your Raspberry Pi.

### Running on Raspberry Pi

For the full experience with real system data:
1. Clone the repository to your Pi
2. Install dependencies: `npm install`
3. Run the backend: `npm run server`
4. Access at `http://[your-pi-ip]:3001`