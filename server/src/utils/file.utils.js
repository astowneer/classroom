function extractFileId(fileUrl) {
  const match = fileUrl.match(/[?&]id=([^&]+)/) || fileUrl.match(/\/d\/([^/]+)/);
  if (!match) throw new Error(`Cannot extract file ID from URL: ${fileUrl}`);
  return match[1];
}

module.exports = { extractFileId };
