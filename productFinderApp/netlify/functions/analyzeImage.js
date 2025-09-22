import fetch from "node-fetch";


const extractItemName = (visionResponse) => {
  if (!visionResponse) return "Unknown item";
  const response = visionResponse.responses?.[0];
  if (!response) return "Unknown item";

  const webDetection = response.webDetection;
  const labels = webDetection?.bestGuessLabels || [];
  const visuallySimilarImages = webDetection?.visuallySimilarImages || [];

  const productLikeLabels = labels
    .map((l) => l.label.trim())
    .filter((label) =>
      !["object", "thing", "artifact", "material"].includes(label.toLowerCase())
    );

  if (productLikeLabels.length > 0) return productLikeLabels[0];

  for (const img of visuallySimilarImages) {
    try {
      const urlParts = img.url.split("/");
      const filename = urlParts[urlParts.length - 1].toLowerCase();
      const nameMatch = filename.match(/[a-z0-9-]+/gi);
      if (nameMatch && nameMatch.length > 0) {
        return nameMatch.join(" ");
      }
    } catch (err) {
      continue;
    }
  }


  const labelAnnotations = response.labelAnnotations || [];
  if (labelAnnotations.length > 0) {
    labelAnnotations.sort((a, b) => (b.score || 0) - (a.score || 0));
    const topLabel = labelAnnotations[0].description.trim();
    if (!["object", "thing", "artifact", "material"].includes(topLabel.toLowerCase())) {
      return topLabel;
    }
  }


  return "Unknown item";
};

export const handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);


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
                { type: "OBJECT_LOCALIZATION", maxResults: 5 }
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