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
    const body = JSON.parse(event.body);
    const imageBase64 = body.imageBase64;

    // Call Google Vision API
    const visionRes = await fetch(process.env.GOOGLE_VISION_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageBase64 }),
    });

    const visionData = await visionRes.json();
    console.log("Google Vision response:", visionData);

    // Extract possible item names
    const possibleItemNames = extractItemNames(visionData.responses?.[0] || {});
    console.log("possibleItemNames from Vision API:", possibleItemNames);

    const itemName = possibleItemNames[0] || "Unknown item";

    // Call RapidAPI only if we have an item name
    let products = [];
    if (itemName !== "Unknown item") {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;
      const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(itemName)}`;

      const rapidResponse = await fetch(rapidApiUrl, {
        headers: {
          "X-RapidAPI-Key": process.env.VITE_REACT_APP_RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.VITE_REACT_APP_RAPIDAPI_HOST,
        },
      });

      const rapidData = await rapidResponse.json();
      products = rapidData.products || [];
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
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong" }),
    };
  }
};