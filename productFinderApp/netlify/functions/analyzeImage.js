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

    // Google Vision API call
    const [result] = await client.annotateImage({
      image: { content: imageBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // Gather candidate search terms
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

    // Remove duplicates
    const uniqueNames = [...new Set(namesToTry)];
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    let products = [];
    let foundName = null;

    // Try each candidate until we find products
    for (const term of uniqueNames) {
      const url = `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(term)}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`;
      console.log("Trying RapidAPI search:", url);

      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": rapidHost,
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data.products?.length) {
        products = data.products;
        foundName = term;
        break; // stop at first successful match
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        itemName: foundName || uniqueNames[0] || "Unknown item",
        products,
        visionLabels: uniqueNames,
      }),
    };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};