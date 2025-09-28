const vision = require("@google-cloud/vision");
const sharp = require("sharp");

// Decode Google credentials
const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  "base64"
).toString("utf-8");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

// 🔹 Helper: rank Vision API labels into candidates
function rankItemNames(result) {
  const candidates = [];

  // 1. Logos (brand names)
  if (result.logoAnnotations?.length) {
    result.logoAnnotations.forEach(logo => {
      if (logo.description) candidates.push({ name: logo.description.trim(), score: 100 });
    });
  }

  // 2. Short text (often product names)
  if (result.textAnnotations?.length) {
    result.textAnnotations.forEach(t => {
      if (t.description) {
        const text = t.description.trim();
        if (text.length <= 20 && !/\s{2,}/.test(text)) {
          candidates.push({ name: text, score: 90 });
        } else {
          candidates.push({ name: text, score: 50 });
        }
      }
    });
  }

  // 3. Web detection best guesses
  if (result.webDetection?.bestGuessLabels?.length) {
    result.webDetection.bestGuessLabels.forEach(l => {
      if (l.label) candidates.push({ name: l.label.trim(), score: 80 });
    });
  }

  // 4. Labels (general categories)
  if (result.labelAnnotations?.length) {
    result.labelAnnotations.forEach(l => {
      if (l.description) candidates.push({ name: l.description.trim(), score: 40 });
    });
  }

  // Deduplicate: keep highest score per name
  const seen = new Map();
  for (const c of candidates) {
    if (!seen.has(c.name) || c.score > seen.get(c.name).score) {
      seen.set(c.name, c);
    }
  }

  // Sort by score descending
  const ranked = Array.from(seen.values()).sort((a, b) => b.score - a.score);
  console.log("Ranked candidates:", ranked);

  return ranked.map(r => r.name);
}

exports.handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No request body" }) };
    }

    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
    }

    const originalBuffer = Buffer.from(imageBase64, "base64");

    // Resize image for OCR / Vision
    const resizedBuffer = await sharp(originalBuffer)
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Call Vision API
    const [result] = await client.annotateImage({
      image: { content: resizedBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "DOCUMENT_TEXT_DETECTION", maxResults: 5 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "OBJECT_LOCALIZATION", maxResults: 5 },
      ],
    });

    // Rank all possible labels
    const rankedNames = rankItemNames(result);

    // Call RapidAPI using top-ranked candidate first, fall back if no products
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    let products = [];
    let chosenName = "Unknown item";

    for (const name of rankedNames) {
      const rapidUrl = `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(name)}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`;

      console.log("Trying RapidAPI with:", name);

      const rapidRes = await fetch(rapidUrl, {
        headers: {
          "X-RapidAPI-Key": rapidKey,
          "X-RapidAPI-Host": rapidHost,
        },
      });

      if (rapidRes.ok) {
        const data = await rapidRes.json();
        if (data.data?.products?.length) {
          products = data.data.products;
          chosenName = name;
          break; // Stop at first successful match
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName: chosenName, products, visionLabels: rankedNames }),
    };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};