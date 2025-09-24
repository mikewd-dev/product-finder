import { ImageAnnotatorClient } from "@google-cloud/vision";
import heic2any from "heic2any";

// Helper to convert base64 image to supported format
const convertToSupportedFormat = async (base64Image) => {
  const byteString = atob(base64Image.split(",")[1] || base64Image);
  const buffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) buffer[i] = byteString.charCodeAt(i);

  const blob = new Blob([buffer]);
  const type = blob.type;

  // If already JPEG/PNG, return as is
  if (type === "image/jpeg" || type === "image/png") {
    return base64Image;
  }

  // Otherwise, convert HEIC/HEIF to JPEG
  const convertedBlob = await heic2any({ blob, toType: "image/jpeg" });
  const arrayBuffer = await convertedBlob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:image/jpeg;base64," + btoa(binary);
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

    // Convert image if needed
    const safeImage = await convertToSupportedFormat(imageBase64);

    // Initialize Vision client
    const client = new ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    });

    const [result] = await client.webDetection({ image: { content: safeImage.split(",")[1] } });

    // Your existing item extraction logic here...
    const possibleItemNames = extractItemNames(result);
    const itemName = possibleItemNames[0] || "Unknown item";

    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

      const rapidRes = await fetch(
        `https://${rapidHost}/products/search?query=${encodeURIComponent(itemName)}`,
        { headers: { "X-RapidAPI-Key": rapidKey, "X-RapidAPI-Host": rapidHost } }
      );
      const rapidData = await rapidRes.json();
      products = rapidData.products || [];
    }

    return { statusCode: 200, body: JSON.stringify({ itemName, products }) };
  } catch (err) {
    console.error("analyzeImage function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};