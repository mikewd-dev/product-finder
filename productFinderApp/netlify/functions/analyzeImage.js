// netlify/functions/vision.js
const vision = require("@google-cloud/vision");

const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  "base64"
).toString("utf-8");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

exports.handler = async function (event) {
  try {
    // Parse the request body
    const { imageUrl, imageBase64 } = JSON.parse(event.body || "{}");

    if (!imageUrl && !imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing imageUrl or imageBase64 in request body" }),
      };
    }

    // Prepare the image for Vision API
    const request = imageUrl
      ? { image: { source: { imageUri: imageUrl } } }
      : { image: { content: imageBase64 } };

    // Perform label detection
    const [result] = await client.labelDetection(request);

    return {
      statusCode: 200,
      body: JSON.stringify({ labels: result.labelAnnotations }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};