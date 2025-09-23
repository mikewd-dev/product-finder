import fetch from "node-fetch";

// Helper to extract item names from Google Vision response
const extractItemNames = (visionResponse) => {
  if (!visionResponse) return [];

  const names = [];

  // 1️⃣ Use best guess labels from webDetection first
  if (visionResponse.webDetection?.bestGuessLabels?.length) {
    visionResponse.webDetection.bestGuessLabels.forEach((labelObj) => {
      if (labelObj.label) names.push(labelObj.label.trim());
    });
  }

  // 2️⃣ Fallback to labelAnnotations if no best guesses
  if (names.length === 0 && visionResponse.labelAnnotations?.length) {
    visionResponse.labelAnnotations.forEach((labelObj) => {
      if (labelObj.description) names.push(labelObj.description.trim());
    });
  }

  return [...new Set(names)]; // remove duplicates
};

export const handler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No request body found" }),
      };
    }

    // Parse incoming JSON
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (err) {
      console.error("Error parsing JSON:", err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" }),
      };
    }

    const imageBase64 = body.imageBase64;
    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No imageBase64 provided" }),
      };
    }

    // Call Google Vision API
    if (!process.env.GOOGLE_VISION_FUNCTION_URL) {
      throw new Error("Missing GOOGLE_VISION_FUNCTION_URL environment variable");
    }

    const visionRes = await fetch(process.env.GOOGLE_VISION_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    });

    if (!visionRes.ok) {
      const text = await visionRes.text();
      throw new Error(`Google Vision API error: ${text}`);
    }

    const visionData = await visionRes.json();
    console.log("Google Vision response:", visionData);

    const possibleItemNames = extractItemNames(visionData.responses?.[0] || {});
    console.log("possibleItemNames from Vision API:", possibleItemNames);

    const itemName = possibleItemNames[0] || "Unknown item";

    // Call RapidAPI only if we have an item name
    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

      if (!rapidHost || !rapidKey) {
        console.warn("RapidAPI credentials missing, skipping product fetch");
      } else {
        const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(
          itemName
        )}`;

        const rapidResponse = await fetch(rapidApiUrl, {
          headers: {
            "X-RapidAPI-Key": rapidKey,
            "X-RapidAPI-Host": rapidHost,
          },
        });

        if (!rapidResponse.ok) {
          const text = await rapidResponse.text();
          console.warn(`RapidAPI error: ${text}`);
        } else {
          const rapidData = await rapidResponse.json();
          products = rapidData.products || [];
        }
      }
    }

    console.log("Final products array:", products);

    return {
      statusCode: 200,
      body: JSON.stringify({
        itemName,
        products,
      }),
    };
  } catch (err) {
    console.error("analyzeImage function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Something went wrong" }),
    };
  }
};