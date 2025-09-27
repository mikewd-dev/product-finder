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

    const namesToTry = [];

    // ✅ Clean OCR text
    if (result.textAnnotations?.length) {
      const rawText = result.textAnnotations[0].description.trim();
      // Replace newlines, split into words
      const tokens = rawText.replace(/\n/g, " ").split(/\s+/);

      // Heuristic: keep tokens that look like brand/product names
      const ocrCandidates = tokens.filter(
        (t) =>
          /^[A-Za-z0-9-]+$/.test(t) && // only keep words with letters/numbers
          t.length > 2 && // avoid short junk like "of", "on"
          !["the", "and", "for", "with", "from"].includes(t.toLowerCase()) // stopwords
      );

      namesToTry.push(...ocrCandidates);
    }

    // ✅ Add best guess labels
    if (result.webDetection?.bestGuessLabels?.length) {
      result.webDetection.bestGuessLabels.forEach((l) => l.label && namesToTry.push(l.label.trim()));
    }

    // ✅ Add Vision label annotations
    if (result.labelAnnotations?.length) {
      result.labelAnnotations.forEach((l) => l.description && namesToTry.push(l.description.trim()));
    }

    const uniqueNames = [...new Set(namesToTry)];
    const itemName = uniqueNames[0] || "Unknown item";

    console.log("Vision extracted candidates:", uniqueNames);

    // RapidAPI
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    const rapidUrl = `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(
      itemName
    )}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`;

    console.log("RapidAPI URL:", rapidUrl);

    const rapidRes = await fetch(rapidUrl, {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": rapidHost,
      },
    });

    let products = [];
    if (rapidRes.ok) {
      const data = await rapidRes.json();
      console.log("RapidAPI response:", JSON.stringify(data, null, 2));
      if (data.products?.length) {
        products = data.products;
      }
    } else {
      console.error("RapidAPI fetch failed:", rapidRes.status, rapidRes.statusText);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, products, visionLabels: uniqueNames }),
    };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};