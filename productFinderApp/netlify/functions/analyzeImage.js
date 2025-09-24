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

    // Prepare image source
    const image = imageUrl
      ? { source: { imageUri: imageUrl } }
      : { content: Buffer.from(imageBase64, "base64") };

    const request = {
      image,
      features: [
        { type: "LABEL_DETECTION" },
        { type: "TEXT_DETECTION" }
      ],
    };

    const [result] = await client.annotateImage(request);

    const labels = result.labelAnnotations?.map(l => l.description) || [];
    const texts = result.textAnnotations?.map(t => t.description) || [];
    const combined = [...texts, ...labels];

    return {
      statusCode: 200,
      body: JSON.stringify({ labels, texts, combined }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};