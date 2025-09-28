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
    const metadata = await sharp(originalBuffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    // --- Step 1: Detect objects on full image ---
    const [objectResult] = await client.annotateImage({
      image: { content: originalBuffer.toString("base64") },
      features: [{ type: "OBJECT_LOCALIZATION", maxResults: 5 }],
    });

    const objects = objectResult.localizedObjectAnnotations || [];
    let mainObject = objects.sort((a, b) => b.score - a.score)[0];
    console.log("Main object detected:", mainObject?.name, mainObject?.score);

    let focusedBuffer = originalBuffer;
    if (mainObject) {
      // Convert normalized coords to pixels
      const vertices = mainObject.boundingPoly.normalizedVertices;
      const left = Math.floor(vertices[0].x * imageWidth);
      const top = Math.floor(vertices[0].y * imageHeight);
      const right = Math.floor(vertices[2].x * imageWidth);
      const bottom = Math.floor(vertices[2].y * imageHeight);

      const width = right - left;
      const height = bottom - top;

      // Crop to main object
      focusedBuffer = await sharp(originalBuffer)
        .extract({ left, top, width, height })
        .resize({ width: 1024, height: 1024, fit: "inside" })
        .jpeg({ quality: 90 })
        .toBuffer();
    }

    // --- Step 2: Vision on full image ---
    const [fullResult] = await client.annotateImage({
      image: { content: originalBuffer.toString("base64") },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
      ],
    });

    // --- Step 3: Vision on focused object ---
    let focusedResult = null;
    if (mainObject) {
      [focusedResult] = await client.annotateImage({
        image: { content: focusedBuffer.toString("base64") },
        features: [
          { type: "WEB_DETECTION", maxResults: 5 },
          { type: "LABEL_DETECTION", maxResults: 5 },
          { type: "LOGO_DETECTION", maxResults: 5 },
          { type: "TEXT_DETECTION", maxResults: 5 },
        ],
      });
    }

    // --- Step 4: Merge results ---
    function extractLabels(result, weight = 1) {
      const names = [];
      if (!result) return names;

      if (result.webDetection?.bestGuessLabels?.length) {
        result.webDetection.bestGuessLabels.forEach((l) =>
          l.label && names.push({ name: l.label.trim(), score: 80 * weight })
        );
      }
      if (result.labelAnnotations?.length) {
        result.labelAnnotations.forEach((l) =>
          names.push({ name: l.description.trim(), score: Math.round(l.score * 100 * weight) })
        );
      }
      if (result.logoAnnotations?.length) {
        result.logoAnnotations.forEach((l) =>
          names.push({ name: l.description.trim(), score: Math.round(l.score * 100 * weight) })
        );
      }
      if (result.textAnnotations?.length) {
        const mainText = result.textAnnotations[0].description.trim();
        if (mainText) names.push({ name: mainText, score: 70 * weight });
      }
      return names;
    }

    const allCandidates = [
      ...extractLabels(fullResult, 1),
      ...extractLabels(focusedResult, 2), // weight focused higher
    ];

    const ranked = Object.values(
      allCandidates.reduce((acc, cur) => {
        if (!acc[cur.name]) acc[cur.name] = { name: cur.name, score: 0 };
        acc[cur.name].score += cur.score;
        return acc;
      }, {})
    ).sort((a, b) => b.score - a.score);

    console.log("Ranked candidates:", ranked);

    const itemName = ranked.length ? ranked[0].name : "Unknown item";

    // --- Step 5: RapidAPI lookup ---
    const rapidHost = process.env.RAPIDAPI_HOST;
    const rapidKey = process.env.RAPIDAPI_KEY;

    const rapidUrl = `https://${rapidHost}/search-light-v2?q=${encodeURIComponent(
      itemName
    )}&country=gb&language=en&page=1&limit=10&sort_by=LOWEST_PRICE&product_condition=ANY&return_filters=false`;

    const rapidRes = await fetch(rapidUrl, {
      headers: {
        "X-RapidAPI-Key": rapidKey,
        "X-RapidAPI-Host": rapidHost,
      },
    });

    let products = [];
    if (rapidRes.ok) {
      const data = await rapidRes.json();
      if (data.data?.products?.length) {
        products = data.data.products;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, products, ranked }),
    };
  } catch (err) {
    console.error("analyzeImage error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};