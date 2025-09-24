// netlify/functions/vision.js
const vision = require("@google-cloud/vision");

// Decode base64 JSON and create Vision client
const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  'base64'
).toString('utf-8');

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