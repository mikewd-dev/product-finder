import fetch from "node-fetch";

// Generic helper to extract multiple plausible product names
const extractCandidateNames = (visionResponse) => {
  if (!visionResponse) return [];

  const response = visionResponse.responses?.[0];
  if (!response) return [];

  const candidates = [];

  // 1️⃣ WebDetection bestGuessLabels
  const webLabels = response.webDetection?.bestGuessLabels || [];
  webLabels.forEach(l => {
    const label = l.label.trim();
    if (!["object","thing","artifact","material"].includes(label.toLowerCase())) {
      candidates.push({ name: label, source: "webDetection" });
    }
  });

  // 2️⃣ LabelAnnotations sorted by score
  const labelAnnotations = response.labelAnnotations || [];
  labelAnnotations
    .sort((a,b) => (b.score || 0) - (a.score || 0))
    .forEach(l => {
      const label = l.description.trim();
      if (!["object","thing","artifact","material"].includes(label.toLowerCase())) {
        candidates.push({ name: label, source: "labelAnnotation", score: l.score });
      }
    });

  // 3️⃣ VisuallySimilarImages heuristics
  const visuallySimilarImages = response.webDetection?.visuallySimilarImages || [];
  visuallySimilarImages.forEach(img => {
    try {
      const urlParts = img.url.split("/");
      const filename = urlParts[urlParts.length-1].toLowerCase();
      const match = filename.match(/[a-z0-9-]+/gi);
      if (match && match.length > 0) {
        candidates.push({ name: match.join(" "), source: "visuallySimilarImage" });
      }
    } catch (err) {}
  });

  return candidates;
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
                { type: "OBJECT_LOCALIZATION", maxResults: 5 }
              ],
            },
          ],
        }),
      }
    );

    const visionData = await visionResponse.json();

    // Extract candidate names
    const candidates = extractCandidateNames(visionData);

    if (!candidates || candidates.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ itemName: "Unknown item", data: [] }),
      };
    }

    let products = [];
    let itemName = "Unknown item";

    // Try RapidAPI search for each candidate until results are found
    for (const candidate of candidates) {
      const rapidApiUrl = new URL(`https://${process.env.RAPIDAPI_HOST}/search`);
      rapidApiUrl.search = new URLSearchParams({
        q: candidate.name,
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

      if (!rapidResponse.ok) continue;

      const productsResponse = await rapidResponse.json();
      products =
        productsResponse?.data?.products ||
        productsResponse?.products ||
        productsResponse?.items ||
        [];

      if (products.length > 0) {
        itemName = candidate.name;
        break;
      }
    }

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