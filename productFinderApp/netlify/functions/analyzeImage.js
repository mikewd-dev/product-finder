// netlify/functions/analyzeImage.js
const vision = require("@google-cloud/vision");
const sharp = require("sharp");

// Helper: extract item names from Google Vision response
const extractItemNames = (visionResponse) => {
  if (!visionResponse) return [];
  const names = [];

  if (visionResponse.webDetection?.bestGuessLabels?.length) {
    visionResponse.webDetection.bestGuessLabels.forEach((labelObj) => {
      if (labelObj.label) names.push(labelObj.label.trim());
    });
  }

  if (names.length === 0 && visionResponse.labelAnnotations?.length) {
    visionResponse.labelAnnotations.forEach((labelObj) => {
      if (labelObj.description) names.push(labelObj.description.trim());
    });
  }

  return [...new Set(names)];
};

exports.handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body" }) };
    }

    let { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    // Remove any data URL prefix and whitespace
    imageBase64 = (imageBase64.split(",")[1] || imageBase64).replace(/\s/g, '');
    let imageBuffer = Buffer.from(imageBase64, "base64");

    // Convert all images to JPEG to guarantee compatibility
    try {
      imageBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (e) {
      console.error("Sharp conversion failed:", e.message);
      return { statusCode: 400, body: JSON.stringify({ error: "Image format unsupported or corrupt" }) };
    }

    // Initialize Vision client
    const client = new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    });

    // Call Google Vision API
    const [result] = await client.webDetection({
      image: { content: imageBuffer.toString("base64") },
    });

    const possibleItemNames = extractItemNames(result);
    const itemName = possibleItemNames[0] || "Unknown item";

    // Call RapidAPI only if item is valid
    let products = [];
    const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
    const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

    if (itemName !== "Unknown item" && rapidHost && rapidKey) {
      const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(itemName)}`;
      const rapidRes = await fetch(rapidApiUrl, {
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": rapidHost,
        },
      });
      const rapidData = await rapidRes.json();
      products = rapidData.products || [];
    }

    return { statusCode: 200, body: JSON.stringify({ itemName, products }) };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};