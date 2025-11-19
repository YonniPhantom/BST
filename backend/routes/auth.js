const express = require('express');
const { createOAuth2Client, generateToken, verifyToken, refreshAccessToken } = require('../lib/auth');
const router = express.Router();

// GET /api/auth/signin - Get Google OAuth URL
router.get('/signin', (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Importante: para obtener refresh token
      scope: scopes,
      prompt: 'consent', // Fuerza el consentimiento para obtener refresh token
      include_granted_scopes: true // Incluir permisos previamente otorgados
    });
    
    res.json({
      authUrl,
      message: 'Redirect user to this URL for authentication'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      error: 'Failed to generate authentication URL',
      message: error.message
    });
  }
});

// GET /api/auth/google/url - Get Google OAuth URL (alias for frontend compatibility)
router.get('/google/url', (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive' // Acceso completo a Drive (lectura y escritura)
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Importante: para obtener refresh token
      scope: scopes,
      prompt: 'consent', // Fuerza el consentimiento para obtener refresh token
      include_granted_scopes: true // Incluir permisos previamente otorgados
    });
    
    res.json({
      authUrl
    });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({
      error: 'Failed to generate Google authentication URL',
      message: error.message
    });
  }
});

// GET /api/auth/callback/google - Handle Google OAuth callback redirect
router.get('/callback/google', async (req, res) => {
  try {
    const { code, error, state } = req.query;
    
    // Si viene con un redirect_uri en el state, usarlo (para Electron)
    let redirectUri = 'http://localhost:5173/auth/callback';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.redirectUri) {
          redirectUri = stateData.redirectUri;
        }
      } catch (e) {
        console.log('Could not parse state, using default redirect');
      }
    }
    
    if (error) {
      return res.redirect(`${redirectUri}?error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      return res.redirect(`${redirectUri}?error=no_code`);
    }
    
    // Si el redirect es al servidor local de Electron (puerto 8080), solo pasar el código
    if (redirectUri.includes('localhost:8080')) {
      return res.redirect(`${redirectUri}?code=${encodeURIComponent(code)}`);
    }
    
    // Si es para el frontend web, procesar el token completo
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user info
    oauth2Client.setCredentials(tokens);
    const { google } = require('googleapis');
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    // Generate JWT token with user info and Google tokens
    const jwtPayload = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date
    };
    
    const jwtToken = generateToken(jwtPayload);
    
    // Redirect to frontend with token
    const finalRedirectUrl = `${redirectUri}?token=${encodeURIComponent(jwtToken)}&user=${encodeURIComponent(JSON.stringify({
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    }))}`;
    
    res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.redirect(`http://localhost:5173/auth/error?error=${encodeURIComponent(error.message)}`);
  }
});

// POST /api/auth/test - Test endpoint
router.post('/test', (req, res) => {
  console.log('📨 POST /api/auth/test - Test endpoint hit');
  res.json({ message: 'Test endpoint works', body: req.body });
});

// POST /api/auth/exchange-code - Exchange authorization code for tokens
router.post('/exchange-code', async (req, res) => {
  console.log('📨 POST /api/auth/exchange-code - Received request');
  console.log('📨 Request body:', req.body);
  try {
    const { code } = req.body;
    
    if (!code) {
      console.log('❌ No code provided');
      return res.status(400).json({
        error: 'Authorization code required'
      });
    }
    
    console.log('✅ Code received, exchanging for tokens...');
    
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user info
    oauth2Client.setCredentials(tokens);
    const { google } = require('googleapis');
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    
    // Generate JWT token with user info and Google tokens
    const jwtPayload = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date
    };
    
    const jwtToken = generateToken(jwtPayload);
    
    res.json({
      token: jwtToken,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      },
      expiresAt: tokens.expiry_date
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'JWT token required'
      });
    }
    
    const decoded = verifyToken(token);
    if (!decoded || !decoded.refreshToken) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }
    
    // Check if access token is still valid
    if (decoded.expiresAt && Date.now() < decoded.expiresAt) {
      return res.json({
        token: token,
        message: 'Token still valid'
      });
    }
    
    // Refresh the access token
    const refreshedTokens = await refreshAccessToken(decoded.refreshToken);
    
    // Generate new JWT with refreshed tokens (remove JWT-specific properties)
    const { iat, exp, ...cleanPayload } = decoded;
    const newPayload = {
      ...cleanPayload,
      accessToken: refreshedTokens.accessToken,
      expiresAt: refreshedTokens.expiresIn,
      refreshToken: refreshedTokens.refreshToken
    };
    
    const newJwtToken = generateToken(newPayload);
    
    res.json({
      token: newJwtToken,
      expiresAt: refreshedTokens.expiresIn
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

// GET /api/auth/session - Get current session info
router.get('/session', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        authenticated: false
      });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        authenticated: false
      });
    }
    
    res.json({
      authenticated: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture
      },
      expiresAt: decoded.expiresAt
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      error: 'Failed to get session',
      message: error.message
    });
  }
});

// POST /api/auth/signout - Sign out user
router.post('/signout', (req, res) => {
  // In a stateless JWT system, signout is handled client-side
  // by removing the token from storage
  res.json({
    message: 'Signed out successfully',
    action: 'Remove token from client storage'
  });
});

// GET /api/auth/providers - Get available auth providers
router.get('/providers', (req, res) => {
  res.json({
    google: {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      signinUrl: '/api/auth/signin',
      callbackUrl: '/api/auth/callback/google'
    }
  });
});

module.exports = router;
