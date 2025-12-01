const jwt = require('jsonwebtoken');
const { google } = require('googleapis');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// OAuth2 client configuration
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://pacheco.yonniphantom.dev/api/auth/callback/google'
  );
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); // 30 días en lugar de 24 horas
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to verify authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  console.log('🔍 Token decodificado:', {
    id: decoded.id,
    email: decoded.email,
    hasAccessToken: !!decoded.accessToken,
    accessTokenPrefix: decoded.accessToken?.substring(0, 20) + '...',
    expiresAt: decoded.expiresAt,
    isExpired: decoded.expiresAt ? new Date(decoded.expiresAt) < new Date() : 'unknown'
  });

  req.user = decoded;
  next();
}

// Refresh Google access token
async function refreshAccessToken(refreshToken) {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return {
      accessToken: credentials.access_token,
      expiresIn: credentials.expiry_date,
      refreshToken: credentials.refresh_token || refreshToken
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

// Get authorized Google Drive client
function getAuthorizedDriveClient(accessToken) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({
    version: 'v3',
    auth: oauth2Client
  });
}

module.exports = {
  createOAuth2Client,
  generateToken,
  verifyToken,
  authenticateToken,
  refreshAccessToken,
  getAuthorizedDriveClient
};
