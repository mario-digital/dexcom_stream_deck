import fs from 'fs';
import path from 'path';

const TOKEN_FILE = 'tokens.json';

class TokenStorage {
  constructor() {
    this.tokenPath = path.join(process.cwd(), TOKEN_FILE);
  }

  // Save tokens to file
  saveTokens(accessToken, refreshToken, expiresAt = null) {
    try {
      const tokenData = {
        accessToken,
        refreshToken,
        expiresAt,
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokenData, null, 2));
      console.log('💾 Tokens saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Error saving tokens:', error);
      return false;
    }
  }

  // Load tokens from file
  loadTokens() {
    try {
      if (!fs.existsSync(this.tokenPath)) {
        console.log('📄 No saved tokens found');
        return null;
      }

      const tokenData = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
      
      // Check if tokens are expired
      if (tokenData.expiresAt && new Date() > new Date(tokenData.expiresAt)) {
        console.log('⏰ Access token has expired, but refresh token may still be valid');
        // We'll still return the refresh token so we can try to refresh
      }
      
      console.log('📄 Tokens loaded successfully');
      return tokenData;
    } catch (error) {
      console.error('❌ Error loading tokens:', error);
      return null;
    }
  }

  // Clear saved tokens
  clearTokens() {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
        console.log('🗑️ Tokens cleared successfully');
      }
      return true;
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
      return false;
    }
  }

  // Check if tokens exist
  hasTokens() {
    return fs.existsSync(this.tokenPath);
  }
}

export default TokenStorage; 