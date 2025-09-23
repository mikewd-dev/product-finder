import fetch from "node-fetch";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Helper to extract item names from Vision API response
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

// ---- GOOGLE VISION CLIENT SETUP ----
let visionClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  visionClient = new ImageAnnotatorClient({ credentials });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  visionClient = new ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
} else {
  throw new Error(
    "No Google Vision credentials found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS."
  );
}

export const handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body found" }) };
    }

    const { imageBase64, imageUrl } = JSON.parse(event.body);

    if (!imageBase64 && !imageUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image present." }) };
    }

    let imageContent;

    if (imageBase64) {
      imageContent = { content: imageBase64 };
    } else if (imageUrl) {
      imageContent = { source: { imageUri: imageUrl } };
    }

    // ---- CALL VISION API ----
    const [visionResponse] = await visionClient.annotateImage({
      requests: [
        {
          image: imageContent,
          features: [{ type: "LABEL_DETECTION", maxResults: 5 }],
        },
      ],
    });

    const possibleItemNames = extractItemNames(visionResponse.responses?.[0] || {});
    const itemName = possibleItemNames[0] || "Unknown item";

    // ---- RAPIDAPI PRODUCTS ----
    let products = [];
    const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;
    const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;

    if (itemName !== "Unknown item" && rapidKey && rapidHost) {
      const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(itemName)}`;
      const rapidRes = await fetch(rapidApiUrl, {
        headers: { "X-RapidAPI-Key": rapidKey, "X-RapidAPI-Host": rapidHost },
      });

      if (rapidRes.ok) {
        const rapidData = await rapidRes.json();
        products = rapidData.products || [];
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, products }),
    };
  } catch (err) {
    console.error("analyzeImage function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Something went wrong" }) };
  }
};