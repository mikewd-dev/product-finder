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
    const { imageUrl, imageBase64 } = JSON.parse(event.body || "{}");

    if (!imageUrl && !imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing imageUrl or imageBase64 in request body" }),
      };
    }

    const request = imageUrl
      ? { image: { source: { imageUri: imageUrl } } }
      : { image: { content: imageBase64 } };

    // Perform label detection
    const [labelResult] = await client.labelDetection(request);
    const labels = labelResult.labelAnnotations?.map(l => l.description) || [];

    // Perform text detection (OCR)
    const [textResult] = await client.textDetection(request);
    const texts = textResult.textAnnotations?.map(t => t.description) || [];

    // Combine labels and text for product matching
    const combined = [...texts, ...labels];

    return {
      statusCode: 200,
      body: JSON.stringify({
        labels,
        texts,
        combined, // Use this array in your product search
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};