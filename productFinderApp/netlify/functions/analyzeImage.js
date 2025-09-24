const vision = require("@google-cloud/vision");
const fs = require('fs');
const path = require('path');

// Read the Base64 string directly from the file
const encodedCredentials = fs.readFileSync(path.join(__dirname, '.netlify', 'base64-credentials.txt'), 'utf8');

// Decode the string and parse the JSON
const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8');

// Create the Vision client using the decoded credentials
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

exports.handler = async function(event, context) {
  try {
    const { imageUrl } = JSON.parse(event.body || '{}');
    if (!imageUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing imageUrl in request body' }),
      };
    }

    // Perform label detection
    const [result] = await client.labelDetection(imageUrl);

    return {
      statusCode: 200,
      body: JSON.stringify({ labels: result.labelAnnotations }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};