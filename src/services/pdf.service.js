const { google } = require('googleapis');
const pdfParse = require('pdf-parse');

function getDriveClient(user) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ access_token: user.accessToken, refresh_token: user.refreshToken });
  return google.drive({ version: 'v3', auth });
}

// Extract Drive file ID from various URL formats
function extractFileId(fileUrl) {
  const match = fileUrl.match(/[?&]id=([^&]+)/) || fileUrl.match(/\/d\/([^/]+)/);
  if (!match) throw new Error(`Cannot extract file ID from URL: ${fileUrl}`);
  return match[1];
}

exports.extractText = async (user, fileUrl) => {
  const drive = getDriveClient(user);
  const fileId = extractFileId(fileUrl);

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  const data = await pdfParse(Buffer.from(response.data));
  return data.text.trim();
};
