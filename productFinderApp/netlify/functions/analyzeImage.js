const vision = require('@google-cloud/vision');

// Instantiate the Vision client
const client = new vision.ImageAnnotatorClient();

const extractCandidateNames = (response) => {
  if (!response) return [];

  const candidates = [];

  const webDetection = response.webDetection;
  const labels = webDetection?.bestGuessLabels || [];
  const visuallySimilarImages = webDetection?.visuallySimilarImages || [];
  const labelAnnotations = response.labelAnnotations || [];

  // 1️⃣ WebDetection bestGuessLabels
  labels.forEach(l => {
    const label = l.label.trim();
    if (!["object","thing","artifact","material"].includes(label.toLowerCase())) {
      candidates.push(label);
    }
  });

  // 2️⃣ LabelAnnotations sorted by score
  labelAnnotations
    .sort((a,b) => (b.score || 0) - (a.score || 0))
    .forEach(l => {
      const label = l.description.trim();
      if (!["object","thing","artifact","material"].includes(label.toLowerCase())) {
        candidates.push(label);
      }
    });

  // 3️⃣ VisuallySimilarImages heuristics
  visuallySimilarImages.forEach(img => {
    try {
      const urlParts = img.url.split("/");
      const filename = urlParts[urlParts.length-1].toLowerCase();
      const match = filename.match(/[a-z0-9-]+/gi);
      if (match && match.length > 0) {
        candidates.push(match.join(" "));
      }
    } catch (err) {}
  });

  // Remove duplicates
  return [...new Set(candidates)];
};

exports.handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);

    // Call Vision API
    const [visionResult] = await client.annotateImage({
      image: { content: imageBase64 },
      features: [
        { type: 'PRODUCT_SEARCH', maxResults: 10 },
        { type: 'LABEL_DETECTION', maxResults: 5 },
        { type: 'WEB_DETECTION', maxResults: 5 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 5 }
      ]
    });

    const response = visionResult.responses?.[0];
    const candidates = extractCandidateNames(response);

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
        q: candidate,
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
        itemName = candidate;
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, data: products }),
    };

  } catch (err) {
    console.error("Error in handler:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};