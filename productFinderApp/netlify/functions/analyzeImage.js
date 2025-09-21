import fetch from "node-fetch";

// Helper to extract item name from Google Vision response
const extractItemName = (visionResponse) => {
  if (!visionResponse) return "Unknown item";

  const bestGuess = visionResponse?.responses?.[0]?.webDetection?.bestGuessLabels?.[0]?.label?.trim();
  if (bestGuess) return bestGuess;

  const label = visionResponse?.responses?.[0]?.labelAnnotations?.[0]?.description?.trim();
  if (label) return label;

  return "Unknown item";
};

export const handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [
                { type: "PRODUCT_SEARCH", maxResults: 10 },
                { type: "LABEL_DETECTION", maxResults: 5 },
                { type: "LOGO_DETECTION", maxResults: 5 },
                { type: "TEXT_DETECTION", maxResults: 5 },
                { type: "WEB_DETECTION", maxResults: 5 },
              ],
            },
          ],
        }),
      }
    );

    const visionData = await visionResponse.json();
    const itemName = extractItemName(visionData);

    if (!itemName || itemName === "Unknown item") {
      return {
        statusCode: 200,
        body: JSON.stringify({ itemName, data: [] }),
      };
    }

    // Call RapidAPI with extracted item name
    const rapidApiUrl = new URL(`https://${process.env.RAPIDAPI_HOST}/search`);
    rapidApiUrl.search = new URLSearchParams({
      q: itemName,
      country: "gb",
      language: "en",
      limit: "10",
      sort_by: "LOWEST_PRICE",
    }).toString();

    const rapidResponse = await fetch(rapidApiUrl.toString(), {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
      },
    });

    if (!rapidResponse.ok) {
      const errorText = await rapidResponse.text();
      console.error("RapidAPI error response:", errorText);
      throw new Error(`RapidAPI request failed with status ${rapidResponse.status}`);
    }

    const productsResponse = await rapidResponse.json();

    // Debug log so you can see exact RapidAPI structure
    console.log("RapidAPI raw response:", JSON.stringify(productsResponse, null, 2));

    // Normalize: make sure `data` is always an array
    const products =
      productsResponse?.data?.products ||
      productsResponse?.products ||
      productsResponse?.items ||
      [];

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, data: products }),
    };
  } catch (err) {
    console.error("Error in analyzeImage handler:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
