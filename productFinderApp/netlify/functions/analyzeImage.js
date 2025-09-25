const vision = require("@google-cloud/vision");

const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  "base64"
).toString("utf-8");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

exports.handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No image provided" }),
      };
    }

    const [result] = await client.labelDetection({
      image: { content: imageBase64 },
    });

    const labels = result.labelAnnotations.map((label) => label.description);

    const [textResult] = await client.textDetection({
      image: { content: imageBase64 },
    });

    const texts = textResult.textAnnotations.map((t) => t.description);

    return {
      statusCode: 200,
      body: JSON.stringify({
        labels,
        texts,
        combined: [...labels, ...texts],
      }),
    };
  } catch (error) {
    console.error("analyzeImage error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};