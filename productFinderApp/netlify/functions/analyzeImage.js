// netlify/functions/analyzeImage.js
import vision from "@google-cloud/vision";
import sharp from "sharp";
import fileType from "file-type"; // ⬅️ new helper to sniff format

// Helper: extract item names
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

export const handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body" }) };
    }

    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    // Convert base64 → Buffer
    let imageBuffer = Buffer.from(imageBase64, "base64");

    // Detect file type
    const detectedType = await fileType.fromBuffer(imageBuffer);

    if (detectedType?.mime === "image/heic" || detectedType?.mime === "image/heif") {
      console.log("Converting HEIC/HEIF to JPEG...");
      imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
    } else {
      console.log("Image is already supported:", detectedType?.mime);
    }

    // Initialize Vision client
    const client = new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    });

    // Call Vision API
    const [result] = await client.webDetection({
      image: { content: imageBuffer.toString("base64") },
    });
    const possibleItemNames = extractItemNames(result);

    const itemName = possibleItemNames[0] || "Unknown item";

    // Query RapidAPI if item was found
    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

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