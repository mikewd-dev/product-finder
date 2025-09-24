import fetch from "node-fetch";

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

export const handler = async (event) => {
  try {
    console.log("Incoming event.body:", event.body);

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No request body provided" }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      console.error("JSON parse error:", err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const { imageBase64 } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No image present in request" }),
      };
    }

    // Call Google Vision API
    const visionRes = await fetch(process.env.GOOGLE_VISION_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    });

    const visionData = await visionRes.json();
    console.log("Google Vision response:", visionData);

    const possibleItemNames = extractItemNames(visionData.responses?.[0] || {});
    console.log("possibleItemNames from Vision API:", possibleItemNames);

    const itemName = possibleItemNames[0] || "Unknown item";

    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

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

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, products }),
    };
  } catch (err) {
    console.error("analyzeImage function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};