import axios from 'axios';
import dotenv from 'dotenv';
import TokenStorage from './token-storage.js';

dotenv.config();

class DexcomAPI {
  constructor() {
    this.clientId = process.env.DEXCOM_CLIENT_ID;
    this.clientSecret = process.env.DEXCOM_CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI;
    this.apiBase = process.env.DEXCOM_API_BASE || 'https://sandbox-api.dexcom.com/v3';
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenStorage = new TokenStorage();
    
    console.log(`🔧 API Base URL: ${this.apiBase}`);
    
    // Create axios instance with base configuration for API calls
    this.api = axios.create({
      baseURL: this.apiBase,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // Create axios instance for OAuth requests (uses v2 endpoints)
    this.oauthApi = axios.create({
      baseURL: this.apiBase.replace('/v3', ''),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  // Generate the authorization URL for OAuth flow
  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'offline_access',
    });

    return `${this.apiBase.replace('/v3', '')}/v2/oauth2/login?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      });

      const response = await this.oauthApi.post('/v2/oauth2/token', params);
      
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      // Save tokens for future use
      const expiresAt = response.data.expires_in ? 
        new Date(Date.now() + response.data.expires_in * 1000).toISOString() : null;
      this.tokenStorage.saveTokens(this.accessToken, this.refreshToken, expiresAt);
      
      console.log('✅ Successfully obtained access token');
      return response.data;
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Refresh the access token using refresh token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await this.oauthApi.post('/v2/oauth2/token', params);
      
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      // Save the new tokens
      const expiresAt = response.data.expires_in ? 
        new Date(Date.now() + response.data.expires_in * 1000).toISOString() : null;
      this.tokenStorage.saveTokens(this.accessToken, this.refreshToken, expiresAt);
      
      console.log('✅ Successfully refreshed access token');
      return response.data;
    } catch (error) {
      console.error('❌ Error refreshing token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Set the access token (useful for testing with existing tokens)
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  // Load saved tokens and check if they're valid
  async loadSavedTokens() {
    const savedTokens = this.tokenStorage.loadTokens();
    if (!savedTokens) {
      return false;
    }

    this.accessToken = savedTokens.accessToken;
    this.refreshToken = savedTokens.refreshToken;

    // Check if access token is expired
    if (savedTokens.expiresAt && new Date() > new Date(savedTokens.expiresAt)) {
      console.log('⏰ Access token expired, attempting to refresh...');
      try {
        await this.refreshAccessToken();
        return true;
      } catch (error) {
        console.log('❌ Failed to refresh token, need to re-authenticate');
        this.clearTokens();
        return false;
      }
    }

    console.log('✅ Loaded valid saved tokens');
    return true;
  }

  // Clear saved tokens
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenStorage.clearTokens();
  }

  // Check if we have valid tokens
  isAuthenticated() {
    return !!this.accessToken;
  }

  // Get the latest glucose readings
  async getGlucoseReadings(startDate = null, endDate = null) {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    try {
      const params = new URLSearchParams();
      
      // If no dates provided, get the last 24 hours
      if (!startDate) {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
      }
      if (!endDate) {
        endDate = new Date().toISOString().slice(0, 19);
      }

      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const url = `${this.apiBase}/users/self/egvs?${params.toString()}`;
      console.log(`🔍 Making request to: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      console.log('✅ Successfully fetched glucose readings');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching glucose readings:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get the latest single glucose reading
  async getLatestGlucoseReading() {
    try {
      const readings = await this.getGlucoseReadings();
      
      if (readings.egvs && readings.egvs.length > 0) {
        // Sort by displayTime to get the most recent
        const sortedReadings = readings.egvs.sort((a, b) => 
          new Date(b.displayTime) - new Date(a.displayTime)
        );
        
        return sortedReadings[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting latest glucose reading:', error.message);
      throw error;
    }
  }

  // Get user info (not available in v3 API)
  async getUserInfo() {
    return {
      error: true,
      message: 'User info endpoint not available in v3 API',
      details: 'The /users/self endpoint does not exist in Dexcom v3 API'
    };
  }

  // Get devices
  async getDevices() {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    try {
      const url = `${this.apiBase}/users/self/devices`;
      console.log(`🔍 Making request to: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      console.log('✅ Successfully fetched devices');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching devices:', error.response?.data || error.message);
      // Return a more graceful error instead of throwing
      return {
        error: true,
        message: 'Devices endpoint not available or access denied',
        details: error.response?.data || error.message
      };
    }
  }

  // Get data range (available in v3 API)
  async getDataRange() {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    try {
      const url = `${this.apiBase}/users/self/dataRange`;
      console.log(`🔍 Making request to: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      console.log('✅ Successfully fetched data range');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching data range:', error.response?.data || error.message);
      return {
        error: true,
        message: 'Data range endpoint not available or access denied',
        details: error.response?.data || error.message
      };
    }
  }

  // Get alerts (available in v3 API)
  async getAlerts(startDate = null, endDate = null) {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    try {
      // Use the same date range as glucose readings if not provided
      if (!startDate || !endDate) {
        const now = new Date();
        endDate = now.toISOString().slice(0, 19);
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const url = `${this.apiBase}/users/self/alerts?${params.toString()}`;
      console.log(`🔍 Making request to: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      console.log('✅ Successfully fetched alerts');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching alerts:', error.response?.data || error.message);
      return {
        error: true,
        message: 'Alerts endpoint not available or access denied',
        details: error.response?.data || error.message
      };
    }
  }

  // Get calibrations (available in v3 API)
  async getCalibrations(startDate = null, endDate = null) {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    try {
      // Use the same date range as glucose readings if not provided
      if (!startDate || !endDate) {
        const now = new Date();
        endDate = now.toISOString().slice(0, 19);
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const url = `${this.apiBase}/users/self/calibrations?${params.toString()}`;
      console.log(`🔍 Making request to: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      console.log('✅ Successfully fetched calibrations');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching calibrations:', error.response?.data || error.message);
      return {
        error: true,
        message: 'Calibrations endpoint not available or access denied',
        details: error.response?.data || error.message
      };
    }
  }

  // Get events (available in v3 API)
  async getEvents(startDate = null, endDate = null) {
    if (!this.accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }

    try {
      // Use the same date range as glucose readings if not provided
      if (!startDate || !endDate) {
        const now = new Date();
        endDate = now.toISOString().slice(0, 19);
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
      }

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const url = `${this.apiBase}/users/self/events?${params.toString()}`;
      console.log(`🔍 Making request to: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      console.log('✅ Successfully fetched events');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching events:', error.response?.data || error.message);
      return {
        error: true,
        message: 'Events endpoint not available or access denied',
        details: error.response?.data || error.message
      };
    }
  }
}

export default DexcomAPI; 