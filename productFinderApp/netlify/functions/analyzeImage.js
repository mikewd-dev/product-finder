import { ImageAnnotatorClient } from "@google-cloud/vision";
import sharp from "sharp";

// Helper to extract item names from Google Vision response
const extractItemNames = (visionResponse) => {
  if (!visionResponse) return [];

  const names = [];

  // Use best guess labels from webDetection first
  if (visionResponse.webDetection?.bestGuessLabels?.length) {
    visionResponse.webDetection.bestGuessLabels.forEach((labelObj) => {
      if (labelObj.label) names.push(labelObj.label.trim());
    });
  }

  // Fallback to labelAnnotations
  if (names.length === 0 && visionResponse.labelAnnotations?.length) {
    visionResponse.labelAnnotations.forEach((labelObj) => {
      if (labelObj.description) names.push(labelObj.description.trim());
    });
  }

  return [...new Set(names)];
};

// Convert HEIC to JPEG buffer if needed
const convertHeicToJpeg = async (buffer) => {
  try {
    return await sharp(buffer).jpeg().toBuffer();
  } catch (err) {
    console.log("Not a HEIC image or failed conversion, sending original buffer");
    return buffer; // If not HEIC, just return original
  }
};

export const handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body provided" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
    }

    const { imageBase64 } = body;
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64.split(",")[1], "base64");

    // Convert HEIC → JPEG if needed
    const jpegBuffer = await convertHeicToJpeg(imageBuffer);

    // Initialize Google Vision client
    const client = new ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    });

    // Call Google Vision API
    const [result] = await client.webDetection({ image: { content: jpegBuffer } });
    const possibleItemNames = extractItemNames(result);
    const itemName = possibleItemNames[0] || "Unknown item";

    // Call RapidAPI if we have an item name
    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

      if (!rapidHost || !rapidKey) throw new Error("RapidAPI credentials missing");

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
    console.error("analyzeImage function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};