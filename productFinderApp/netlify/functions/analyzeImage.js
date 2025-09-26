const vision = require("@google-cloud/vision");

// Decode Google credentials
const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  "base64"
).toString("utf-8");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

exports.handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body" }) };
    }

    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Call Vision API
    const [result] = await client.annotateImage({
      image: { content: imageBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // Gather all possible labels
    const namesToTry = [];
    if (result.webDetection?.bestGuessLabels?.length)
      result.webDetection.bestGuessLabels.forEach(l => l.label && namesToTry.push(l.label.trim()));
    if (result.labelAnnotations?.length)
      result.labelAnnotations.forEach(l => l.description && namesToTry.push(l.description.trim()));
    if (result.textAnnotations?.length)
      result.textAnnotations.forEach(t => t.description && namesToTry.push(t.description.trim()));

    const uniqueNames = [...new Set(namesToTry)];

    // Take top 2 labels
    const topLabels = uniqueNames.slice(0, 2);
    if (topLabels.length === 0) topLabels.push("Unknown item");

    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    // Call RapidAPI in parallel
    const fetchPromises = topLabels.map(async (label) => {
      const res = await fetch(
        `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(label)}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`,
        {
          headers: {
            "X-RapidAPI-Key": rapidKey,
            "X-RapidAPI-Host": rapidHost,
          },
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.products?.length ? { products: data.products, label } : null;
    });

    // Wait for first successful result
    const results = await Promise.all(fetchPromises);
    const found = results.find(r => r !== null);

    return {
      statusCode: 200,
      body: JSON.stringify({
        itemName: found?.label || topLabels[0],
        products: found?.products || [],
        visionLabels: uniqueNames,
      }),
    };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};