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

    // --- Step 1: Run primary features with TEXT_DETECTION ---
    const [primaryResult] = await client.annotateImage({
      image: { content: imageBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LOGO_DETECTION", maxResults: 3 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "OBJECT_LOCALIZATION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // Gather all possible names
    let namesToTry = [];

    if (primaryResult.webDetection?.bestGuessLabels?.length) {
      primaryResult.webDetection.bestGuessLabels.forEach(l => l.label && namesToTry.push(l.label.trim()));
    }

    if (primaryResult.logoAnnotations?.length) {
      primaryResult.logoAnnotations.forEach(l => l.description && namesToTry.push(l.description.trim()));
    }

    if (primaryResult.labelAnnotations?.length) {
      primaryResult.labelAnnotations.forEach(l => l.description && namesToTry.push(l.description.trim()));
    }

    if (primaryResult.textAnnotations?.length) {
      primaryResult.textAnnotations.forEach(t => t.description && namesToTry.push(t.description.trim()));
    }

    // --- Step 2: Fallback with DOCUMENT_TEXT_DETECTION if no text found ---
    if (!primaryResult.textAnnotations?.length) {
      const [docResult] = await client.annotateImage({
        image: { content: imageBuffer.toString("base64") },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      });

      if (docResult.fullTextAnnotation?.text) {
        namesToTry.push(docResult.fullTextAnnotation.text.trim());
      }
    }

    const uniqueNames = [...new Set(namesToTry)];
    const itemName = uniqueNames[0] || "Unknown item";

    // --- Step 3: Call RapidAPI with best guess ---
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    const rapidRes = await fetch(
      `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(itemName)}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`,
      {
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": rapidHost,
        },
      }
    );

    let products = [];
    if (rapidRes.ok) {
      const data = await rapidRes.json();
      if (data.products?.length) products = data.products;
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