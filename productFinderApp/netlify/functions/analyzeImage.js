import fetch from "node-fetch";
import { ImageAnnotatorClient } from "@google-cloud/vision";

// Helper to extract item names from Google Vision response
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
  // Netlify: JSON stored as env var
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  visionClient = new ImageAnnotatorClient({ credentials });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Local: file path
  visionClient = new ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
} else {
  throw new Error(
    "No Google Vision credentials found. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (Netlify) or GOOGLE_APPLICATION_CREDENTIALS (local)."
  );
}

export const handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body found" }) };
    }

    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No imageBase64 provided" }) };
    }

    // ---- CALL VISION API ----
    const [visionResponse] = await visionClient.annotateImage({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "LABEL_DETECTION", maxResults: 5 }],
        },
      ],
    });

    const possibleItemNames = extractItemNames(visionResponse.responses?.[0] || {});
    const itemName = possibleItemNames[0] || "Unknown item";
    console.log("Item name from Vision API:", itemName);

    // ---- RAPIDAPI PRODUCTS ----
    let products = [];
    const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;
    const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;

    if (itemName !== "Unknown item" && rapidKey && rapidHost) {
      try {
        const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(itemName)}`;
        const rapidRes = await fetch(rapidApiUrl, {
          headers: {
            "X-RapidAPI-Key": rapidKey,
            "X-RapidAPI-Host": rapidHost,
          },
        });

        if (rapidRes.ok) {
          const rapidData = await rapidRes.json();
          products = rapidData.products || [];
        } else {
          const text = await rapidRes.text();
          console.warn("RapidAPI error:", text);
        }
      } catch (err) {
        console.error("Error fetching RapidAPI:", err);
      }
    } else {
      console.warn("Skipping RapidAPI fetch (missing credentials or unknown item)");
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