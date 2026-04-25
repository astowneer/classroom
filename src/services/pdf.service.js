const pdfParse = require('pdf-parse');
const axios = require('axios');

exports.extractText = async (fileUrl) => {
  const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  const data = await pdfParse(Buffer.from(response.data));
  return data.text;
};
