const { google } = require('googleapis');
const { User } = require('../models');

/**
 * Creates an OAuth2 client for a user that automatically refreshes
 * the access token and persists the new token to the database.
 */
function createAuthClient(user) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  auth.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });

  // Automatically save refreshed token to DB
  auth.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await User.update(
        { accessToken: tokens.access_token },
        { where: { id: user.id } }
      );
    }
  });

  return auth;
}

module.exports = { createAuthClient };
