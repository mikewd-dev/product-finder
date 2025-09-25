const vision = require("@google-cloud/vision");

const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  "base64"
).toString("utf-8");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

const extractCandidateLabels = (visionResponse) => {
  return [
    ...(visionResponse.textAnnotations?.map(t => t.description) || []),
    ...(visionResponse.webDetection?.bestGuessLabels?.map(l => l.label) || []),
    ...(visionResponse.labelAnnotations?.map(l => l.description) || [])
  ].map(l => l.trim()).filter(Boolean);
};

exports.handler = async function (event) {
  try {console.log("RapidAPI host:", process.env.RAPIDAPI_HOST);
console.log("RapidAPI key:", process.env.RAPIDAPI_KEY ? "SET" : "MISSING");
    const { imageBase64 } = JSON.parse(event.body || "{}");
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");

    const [result] = await client.annotateImage({
      image: { content: imageBuffer.toString("base64") },
      features: [
        { type: "PRODUCT_SEARCH", maxResults: 10 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
        { type: "WEB_DETECTION", maxResults: 5 },
      ],
    });

    const candidateLabels = extractCandidateLabels(result);

    // Query RapidAPI using each candidate label
    const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
    const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

    let products = [];
    let usedLabel = "Unknown item";

    for (const label of candidateLabels) {
      const rapidRes = await fetch(`https://${rapidHost}/products/search?query=${encodeURIComponent(label)}`, {
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": rapidHost,
        },
      });
      const rapidData = await rapidRes.json();
      if (rapidData.products?.length) {
        products = rapidData.products;
        usedLabel = label;
        break; // stop at the first successful label
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName: usedLabel, products }),
    };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};