import vision from "@google-cloud/vision";
import fetch from "node-fetch";

// 🔹 Extract item names from Google Vision response
const extractItemNames = (visionResponse) => {
  if (!visionResponse) return [];

  const names = [];

  // Use best guess labels first
  if (visionResponse.webDetection?.bestGuessLabels?.length) {
    visionResponse.webDetection.bestGuessLabels.forEach((labelObj) => {
      if (labelObj.label) names.push(labelObj.label.trim());
    });
  }

  // Fallback to label annotations
  if (names.length === 0 && visionResponse.labelAnnotations?.length) {
    visionResponse.labelAnnotations.forEach((labelObj) => {
      if (labelObj.description) names.push(labelObj.description.trim());
    });
  }

  return [...new Set(names)]; // remove duplicates
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = body.imageBase64;

    if (!imageBase64) {
      throw new Error("No image present.");
    }

    // 🔹 Initialize Vision client with credentials from env
    const client = new vision.ImageAnnotatorClient({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
    });

    // 🔹 Call Google Vision API
    const [visionResult] = await client.annotateImage({
      image: { content: imageBase64 },
      features: [
        { type: "WEB_DETECTION" },
        { type: "LABEL_DETECTION" },
      ],
    });

    console.log("Google Vision response:", JSON.stringify(visionResult, null, 2));

    // 🔹 Extract item names
    const possibleItemNames = extractItemNames(visionResult);
    const itemName = possibleItemNames[0] || "Unknown item";
    console.log("Item name guess:", itemName);

    // 🔹 Call RapidAPI only if we have an item name
    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.RAPIDAPI_HOST;
      const rapidKey = process.env.RAPIDAPI_KEY;

      const rapidApiUrl = `https://${rapidHost}/search?query=${encodeURIComponent(itemName)}`;

      const rapidRes = await fetch(rapidApiUrl, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": rapidHost,
        },
      });

      const rapidData = await rapidRes.json();
      products = rapidData.products || [];
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, products }),
    };
  } catch (err) {
    console.error("analyzeImage function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Something went wrong" }),
    };
  }
};