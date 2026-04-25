const { google } = require('googleapis');
const { createAuthClient } = require('../utils/googleAuth');
const pdfParse = require('pdf-parse');
const fs = require('fs');

function extractFileId(fileUrl) {
  const match = fileUrl.match(/[?&]id=([^&]+)/) || fileUrl.match(/\/d\/([^/]+)/);
  if (!match) throw new Error(`Cannot extract file ID from URL: ${fileUrl}`);
  return match[1];
}

exports.extractText = async (user, fileUrl) => {
  const auth = createAuthClient(user);
  const drive = google.drive({ version: 'v3', auth });
  const fileId = extractFileId(fileUrl);
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const data = await pdfParse(Buffer.from(response.data));
  return data.text.trim();
};

exports.extractFromLocalFile = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text.trim();
};
