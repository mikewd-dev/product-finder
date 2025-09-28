const vision = require("@google-cloud/vision");
const sharp = require("sharp");

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

    const originalBuffer = Buffer.from(imageBase64, "base64");
    const metadata = await sharp(originalBuffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    // Initial Vision API call for Object Localization
    const [result] = await client.annotateImage({
      image: { content: originalBuffer.toString("base64") },
      features: [
        { type: "OBJECT_LOCALIZATION", maxResults: 5 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // Find the highest-confidence object
    const objects = result.localizedObjectAnnotations || [];
    let mainObject = objects.sort((a, b) => b.score - a.score)[0];
    console.log("Main object detected:", mainObject?.name, mainObject?.score);

    let focusedBuffer = originalBuffer;

    if (mainObject) {
      // Convert normalized coordinates to pixels
      const vertices = mainObject.boundingPoly.normalizedVertices;
      const left = Math.floor(vertices[0].x * imageWidth);
      const top = Math.floor(vertices[0].y * imageHeight);
      const right = Math.floor(vertices[2].x * imageWidth);
      const bottom = Math.floor(vertices[2].y * imageHeight);
      const width = right - left;
      const height = bottom - top;

      // Crop to the main object
      focusedBuffer = await sharp(originalBuffer)
        .extract({ left, top, width, height })
        .resize({ width: 1024, height: 1024, fit: "inside" })
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    // Focused Vision API call on cropped object
    const [focusedResult] = await client.annotateImage({
      image: { content: focusedBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // Gather all possible labels
    const namesToTry = [];

    if (focusedResult.webDetection?.bestGuessLabels?.length) {
      focusedResult.webDetection.bestGuessLabels.forEach(l => l.label && namesToTry.push(l.label.trim()));
    }

    if (focusedResult.labelAnnotations?.length) {
      focusedResult.labelAnnotations.forEach(l => l.description && namesToTry.push(l.description.trim()));
    }

    if (focusedResult.logoAnnotations?.length) {
      focusedResult.logoAnnotations.forEach(l => l.description && namesToTry.push(l.description.trim()));
    }

    if (focusedResult.textAnnotations?.length) {
      const mainText = focusedResult.textAnnotations[0].description.trim();
      if (mainText) namesToTry.push(mainText);
    }

    const uniqueNames = [...new Set(namesToTry)];
    console.log("Focused Vision labels:", uniqueNames);

    const itemName = uniqueNames[0] || "Unknown item";

    // Call RapidAPI
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    const rapidUrl = `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(itemName)}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`;

    const rapidRes = await fetch(rapidUrl, {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": rapidHost,
      },
    });

    let products = [];
    if (rapidRes.ok) {
      const data = await rapidRes.json();
      if (data.data?.products?.length) {
        products = data.data.products;
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