const vision = require("@google-cloud/vision");

// Decode Google credentials
const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  "base64"
).toString("utf-8");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

exports.handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body" }) };
    }

    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Call Vision API with multiple features
    const [result] = await client.annotateImage({
      image: { content: imageBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // Gather all possible names
    const namesToTry = [];

    if (result.webDetection?.bestGuessLabels?.length) {
      result.webDetection.bestGuessLabels.forEach(l => l.label && namesToTry.push(l.label.trim()));
    }

    if (result.labelAnnotations?.length) {
      result.labelAnnotations.forEach(l => l.description && namesToTry.push(l.description.trim()));
    }

    if (result.textAnnotations?.length) {
      result.textAnnotations.forEach(t => t.description && namesToTry.push(t.description.trim()));
    }

    const uniqueNames = [...new Set(namesToTry)];

    // RapidAPI credentials
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    let products = [];
    let itemName = "Unknown item";

    for (const name of uniqueNames) {
      const rapidRes = await fetch(
        `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(name)}&country=gb&language=en&page=1&limit=10&sort_by=BEST_MATCH&product_condition=ANY&return_filters=false`,
        {
          headers: {
            "X-RapidAPI-Key": rapidKey,
            "X-RapidAPI-Host": rapidHost,
          },
        }
      );

      if (!rapidRes.ok) continue;

      const data = await rapidRes.json();

      if (data.data?.products?.length) {
        products = data.data.products; // ✅ correct path
        itemName = name;
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, products, visionLabels: uniqueNames }),
    };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};