# Dexcom API Proof of Concept

This is a proof of concept application to test the Dexcom API and retrieve glucose readings from your Dexcom G7 device.

## Prerequisites

1. **Dexcom Developer Account**: You need a Dexcom Developer account at https://developer.dexcom.com/
2. **Node.js**: Version 16 or higher
3. **Dexcom CGM Device**: A Dexcom G7 or other compatible device with data

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Dexcom API credentials:

```bash
cp env.example .env
```

Edit the `.env` file with your actual credentials:

```env
# Dexcom API Credentials
DEXCOM_CLIENT_ID=your_client_id_here
DEXCOM_CLIENT_SECRET=your_client_secret_here

# Redirect URI (must match what you registered in your Dexcom app)
REDIRECT_URI=http://localhost:3000/callback

# API Base URL (use sandbox for testing)
DEXCOM_API_BASE=https://sandbox-api.dexcom.com

# Port for the local server
PORT=3000
```

### 3. Dexcom Developer App Configuration

In your Dexcom Developer account:

1. Create a new application
2. Set the redirect URI to: `http://localhost:3000/callback`
3. Note down your Client ID and Client Secret
4. Make sure your app has the necessary scopes (typically `offline_access`)

## Usage

### Start the Application

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

### OAuth Flow

1. Visit `http://localhost:3000` in your browser
2. The application will automatically open the Dexcom authorization page
3. Log in with your Dexcom credentials and authorize the application
4. You'll be redirected back to the application

### Testing the API

After successful authentication, you can test various endpoints:

- **Test All Endpoints**: `http://localhost:3000/test-api`
- **Latest Glucose Reading**: `http://localhost:3000/latest-reading`
- **User Information**: `http://localhost:3000/user-info`
- **Device Information**: `http://localhost:3000/devices`

## API Endpoints

The application provides the following endpoints:

### `/test-api`
Tests all major API endpoints and returns a summary of the data.

### `/latest-reading`
Returns the most recent glucose reading with formatted display information.

### `/user-info`
Returns information about the authenticated user.

### `/devices`
Returns information about connected Dexcom devices.

## Data Structure

Glucose readings are returned in the following format:

```json
{
  "systemTime": "2023-01-01T12:00:00",
  "displayTime": "2023-01-01T12:00:00",
  "value": 120,
  "unit": "mg/dL",
  "realtimeValue": 120,
  "smoothedValue": 118,
  "status": "OK",
  "trend": "Flat",
  "trendRate": 0.0
}
```

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**: Make sure the redirect URI in your `.env` file exactly matches what you configured in your Dexcom Developer app.

2. **"Invalid client credentials"**: Double-check your Client ID and Client Secret in the `.env` file.

3. **"No glucose readings found"**: This might happen if:
   - Your device hasn't been connected recently
   - You're using the sandbox environment (which may not have real data)
   - The date range doesn't contain any readings

4. **CORS issues**: The application runs locally, so CORS shouldn't be an issue, but make sure your Dexcom app configuration allows localhost.

### Switching to Production

To use the production Dexcom API instead of sandbox:

1. Change `DEXCOM_API_BASE` in your `.env` file to: `https://api.dexcom.com`
2. Make sure your Dexcom Developer app is configured for production use

## Next Steps

Once you've successfully retrieved data from the Dexcom API, you can:

1. Integrate this with your Stream Deck application
2. Set up automated data fetching
3. Create alerts based on glucose levels
4. Build a dashboard for monitoring

## Security Notes

- Never commit your `.env` file to version control
- Keep your Client Secret secure
- Consider implementing token refresh logic for long-running applications
- The access tokens expire, so you'll need to re-authenticate periodically 