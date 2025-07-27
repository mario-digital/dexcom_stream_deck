import express from 'express';
import open from 'open';
import DexcomAPI from './dexcom-api.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Dexcom API client
const dexcomAPI = new DexcomAPI();

// Store authorization code temporarily
let authCode = null;

// Middleware to parse URL parameters
app.use(express.urlencoded({ extended: true }));

// Home route - start the OAuth flow
app.get('/', async (req, res) => {
  try {
    // First try to load saved tokens
    const hasValidTokens = await dexcomAPI.loadSavedTokens();
    
    if (hasValidTokens) {
      res.send(`
        <h1>Dexcom API Proof of Concept</h1>
        <p>✅ You are already authenticated with saved tokens!</p>
        <p><a href="/test-api">Test the API</a></p>
        <p><a href="/latest-reading">Get Latest Glucose Reading</a></p>
        <p><a href="/user-info">Get User Info (Not available in v3)</a></p>
        <p><a href="/devices">Get Devices</a></p>
        <p><a href="/data-range">Get Data Range</a></p>
        <p><a href="/alerts">Get Alerts (supports ?startDate=...&endDate=...)</a></p>
        <p><a href="/calibrations">Get Calibrations (supports ?startDate=...&endDate=...)</a></p>
        <p><a href="/events">Get Events (supports ?startDate=...&endDate=...)</a></p>
        <p><a href="/logout">Logout (Clear Tokens)</a></p>
      `);
    } else {
      const authUrl = dexcomAPI.getAuthUrl();
      console.log('🔗 Opening authorization URL in browser...');
      await open(authUrl);
      
      res.send(`
        <h1>Dexcom API Proof of Concept</h1>
        <p>Authorization URL opened in your browser. Please complete the OAuth flow.</p>
        <p>After authorization, you'll be redirected back here and we can test the API.</p>
        <p><a href="/test-api">Test API (after authorization)</a></p>
      `);
    }
  } catch (error) {
    console.error('Error opening auth URL:', error);
    res.status(500).send('Error starting OAuth flow');
  }
});

// OAuth callback route
app.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    console.error('❌ OAuth error:', error);
    return res.status(400).send(`OAuth error: ${error}`);
  }
  
  if (!code) {
    return res.status(400).send('No authorization code received');
  }
  
  try {
    console.log('🔄 Exchanging authorization code for access token...');
    await dexcomAPI.exchangeCodeForToken(code);
    
    res.send(`
      <h1>✅ Authentication Successful!</h1>
      <p>You have successfully authenticated with Dexcom API.</p>
      <p><a href="/test-api">Test the API</a></p>
      <p><a href="/latest-reading">Get Latest Glucose Reading</a></p>
      <p><a href="/user-info">Get User Info</a></p>
      <p><a href="/devices">Get Devices</a></p>
    `);
  } catch (error) {
    console.error('❌ Error exchanging code for token:', error);
    res.status(500).send(`Error exchanging code for token: ${error.message}`);
  }
});

// Test API route
app.get('/test-api', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    console.log('🧪 Testing API endpoints...');
    
    // Test multiple endpoints
    const [userInfo, devices, glucoseReadings, dataRange, alerts, calibrations, events] = await Promise.all([
      dexcomAPI.getUserInfo(),
      dexcomAPI.getDevices(),
      dexcomAPI.getGlucoseReadings(),
      dexcomAPI.getDataRange(),
      dexcomAPI.getAlerts(),
      dexcomAPI.getCalibrations(),
      dexcomAPI.getEvents()
    ]);
    
    // Check which endpoints worked
    const workingEndpoints = [];
    const failedEndpoints = [];
    
    if (!userInfo.error) {
      workingEndpoints.push('userInfo');
    } else {
      failedEndpoints.push('userInfo');
    }
    
    if (!devices.error) {
      workingEndpoints.push('devices');
    } else {
      failedEndpoints.push('devices');
    }
    
    if (glucoseReadings.egvs) {
      workingEndpoints.push('glucoseReadings');
    } else {
      failedEndpoints.push('glucoseReadings');
    }
    
    if (!dataRange.error) {
      workingEndpoints.push('dataRange');
    } else {
      failedEndpoints.push('dataRange');
    }
    
    if (!alerts.error) {
      workingEndpoints.push('alerts');
    } else {
      failedEndpoints.push('alerts');
    }
    
    if (!calibrations.error) {
      workingEndpoints.push('calibrations');
    } else {
      failedEndpoints.push('calibrations');
    }
    
    if (!events.error) {
      workingEndpoints.push('events');
    } else {
      failedEndpoints.push('events');
    }
    
    res.json({
      success: true,
      message: `API test completed. Working: ${workingEndpoints.join(', ')}. Failed: ${failedEndpoints.join(', ')}`,
      data: {
        userInfo,
        devices,
        glucoseReadings: {
          count: glucoseReadings.egvs?.length || 0,
          latest: glucoseReadings.egvs?.[0] || null
        },
        dataRange,
        alerts,
        calibrations,
        events
      },
      workingEndpoints,
      failedEndpoints
    });
  } catch (error) {
    console.error('❌ API test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// Get latest glucose reading
app.get('/latest-reading', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    console.log('📊 Fetching latest glucose reading...');
    const latestReading = await dexcomAPI.getLatestGlucoseReading();
    
    if (!latestReading) {
      return res.json({
        success: false,
        message: 'No glucose readings found'
      });
    }
    
    res.json({
      success: true,
      reading: latestReading,
      formatted: {
        value: `${latestReading.value} ${latestReading.unit}`,
        time: new Date(latestReading.displayTime).toLocaleString(),
        trend: latestReading.trend,
        status: latestReading.status
      }
    });
  } catch (error) {
    console.error('❌ Error getting latest reading:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || null,
      status: error.response?.status || null
    });
  }
});

// Get user info
app.get('/user-info', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    console.log('👤 Fetching user info...');
    const userInfo = await dexcomAPI.getUserInfo();
    
    if (userInfo.error) {
      res.json({
        success: false,
        message: userInfo.message,
        details: userInfo.details
      });
    } else {
      res.json({
        success: true,
        userInfo
      });
    }
  } catch (error) {
    console.error('❌ Error getting user info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get devices
app.get('/devices', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    console.log('📱 Fetching devices...');
    const devices = await dexcomAPI.getDevices();
    
    if (devices.error) {
      res.json({
        success: false,
        message: devices.message,
        details: devices.details
      });
    } else {
      res.json({
        success: true,
        devices
      });
    }
  } catch (error) {
    console.error('❌ Error getting devices:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data range
app.get('/data-range', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    console.log('📊 Fetching data range...');
    const dataRange = await dexcomAPI.getDataRange();
    
    if (dataRange.error) {
      res.json({
        success: false,
        message: dataRange.message,
        details: dataRange.details
      });
    } else {
      res.json({
        success: true,
        dataRange
      });
    }
  } catch (error) {
    console.error('❌ Error getting data range:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get alerts
app.get('/alerts', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    // Allow custom date range via query parameters
    const { startDate, endDate } = req.query;
    
    console.log('🚨 Fetching alerts...');
    const alerts = await dexcomAPI.getAlerts(startDate, endDate);
    
    if (alerts.error) {
      res.json({
        success: false,
        message: alerts.message,
        details: alerts.details
      });
    } else {
      res.json({
        success: true,
        alerts
      });
    }
  } catch (error) {
    console.error('❌ Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get calibrations
app.get('/calibrations', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    // Allow custom date range via query parameters
    const { startDate, endDate } = req.query;
    
    console.log('🔧 Fetching calibrations...');
    const calibrations = await dexcomAPI.getCalibrations(startDate, endDate);
    
    if (calibrations.error) {
      res.json({
        success: false,
        message: calibrations.message,
        details: calibrations.details
      });
    } else {
      res.json({
        success: true,
        calibrations
      });
    }
  } catch (error) {
    console.error('❌ Error getting calibrations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get events
app.get('/events', async (req, res) => {
  try {
    if (!dexcomAPI.accessToken) {
      return res.status(401).send('Not authenticated. Please complete OAuth flow first.');
    }
    
    // Allow custom date range via query parameters
    const { startDate, endDate } = req.query;
    
    console.log('📅 Fetching events...');
    const events = await dexcomAPI.getEvents(startDate, endDate);
    
    if (events.error) {
      res.json({
        success: false,
        message: events.message,
        details: events.details
      });
    } else {
      res.json({
        success: true,
        events
      });
    }
  } catch (error) {
    console.error('❌ Error getting events:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Logout - clear saved tokens
app.get('/logout', (req, res) => {
  dexcomAPI.clearTokens();
  res.send(`
    <h1>Logged Out</h1>
    <p>✅ Tokens have been cleared successfully.</p>
    <p><a href="/">Go back to home</a></p>
  `);
});

// Start the server
app.listen(port, async () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📋 Make sure you have set up your .env file with Dexcom API credentials`);
  
  // Try to load saved tokens on startup
  try {
    const hasValidTokens = await dexcomAPI.loadSavedTokens();
    if (hasValidTokens) {
      console.log(`✅ Loaded valid saved tokens - you're already authenticated!`);
    } else {
      console.log(`🔗 Visit http://localhost:${port} to start the OAuth flow`);
    }
  } catch (error) {
    console.log(`🔗 Visit http://localhost:${port} to start the OAuth flow`);
  }
}); 