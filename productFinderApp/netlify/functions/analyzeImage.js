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

    // Resize image with sharp to recommended minimum for OCR / Vision
    const resizedBuffer = await sharp(originalBuffer)
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }) // preserves aspect ratio
      .jpeg({ quality: 90 }) // optional: compress to reduce payload
      .toBuffer();

    // Call Vision API
    const [result] = await client.annotateImage({
      image: { content: resizedBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "OBJECT_LOCALIZATION", maxResults: 5 },
        { type: "DOCUMENT_TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // Gather all possible labels
    const namesToTry = [];

    if (result.webDetection?.bestGuessLabels?.length) {
      result.webDetection.bestGuessLabels.forEach((l) =>
        l.label && namesToTry.push(l.label.trim())
      );
    }

    if (result.labelAnnotations?.length) {
      result.labelAnnotations.forEach((l) =>
        l.description && namesToTry.push(l.description.trim())
      );
    }

    if (result.logoAnnotations?.length) {
      result.logoAnnotations.forEach((logo) =>
        logo.description && namesToTry.push(logo.description.trim())
      );
    }
    

    if (result.textAnnotations?.length) {
      const mainText = result.textAnnotations[0].description.trim();
      if (mainText) namesToTry.push(mainText);
    }

    const uniqueNames = [...new Set(namesToTry)];
    console.log("Vision labels:", uniqueNames);

    const itemName = uniqueNames[0] || "Unknown item";

    // Call RapidAPI
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    const rapidUrl = `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(
      itemName
    )}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`;
    console.log("RapidAPI URL:", rapidUrl);

    const rapidRes = await fetch(rapidUrl, {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": rapidHost,
      },
    });

    let products = [];
    if (rapidRes.ok) {
      const data = await rapidRes.json();
      console.log("RapidAPI response:", JSON.stringify(data, null, 2));
      if (data.data?.products?.length) {
        products = data.data.products;
      }
    } else {
      console.error("RapidAPI fetch failed:", rapidRes.status, rapidRes.statusText);
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