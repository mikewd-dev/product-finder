// netlify/functions/analyzeImage.js

const vision = require("@google-cloud/vision");

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

  // Fallback to labelAnnotations if no best guesses
  if (names.length === 0 && visionResponse.labelAnnotations?.length) {
    visionResponse.labelAnnotations.forEach((labelObj) => {
      if (labelObj.description) names.push(labelObj.description.trim());
    });
  }

  return [...new Set(names)]; // remove duplicates
};

export const handler = async (event) => {
  try {
    console.log("Incoming event.body:", event.body);

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body provided" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      console.error("JSON parse error:", err);
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON in request body" }) };
    }

    const { imageBase64 } = body;
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    // Initialize Google Vision client
    const client = new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    });

    // Call Google Vision API
    const [result] = await client.webDetection({ image: { content: imageBase64 } });
    console.log("Google Vision result:", result);

    const possibleItemNames = extractItemNames(result);
    console.log("Possible item names:", possibleItemNames);

    const itemName = possibleItemNames[0] || "Unknown item";

    // Call RapidAPI only if we have an item name
    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

      if (!rapidHost || !rapidKey) {
        throw new Error("RapidAPI credentials are missing");
      }

      const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(itemName)}`;
      console.log("Calling RapidAPI:", rapidApiUrl);

      const rapidRes = await fetch(rapidApiUrl, {
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": rapidHost,
        },
      });

      const rapidData = await rapidRes.json();
      products = rapidData.products || [];
    }

    console.log("Final products array:", products);

    return { statusCode: 200, body: JSON.stringify({ itemName, products }) };
  } catch (err) {
    console.error("analyzeImage function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};