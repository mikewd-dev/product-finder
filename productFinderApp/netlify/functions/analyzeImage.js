import fs from "fs";
import path from "path";
import vision from "@google-cloud/vision";
import fetch from "node-fetch";

// Extract multiple possible item names from all Vision detections
const extractItemNames = (response) => {
  if (!response) return [];
  const names = [];

  // 1️⃣ Web detection best guesses
  const webLabels = response.webDetection?.bestGuessLabels || [];
  webLabels.forEach((l) => {
    const label = l.label.trim();
    if (!["object", "thing", "artifact", "material"].includes(label.toLowerCase())) {
      names.push(label);
    }
  });

  // 2️⃣ Visually similar images
  const visuallySimilarImages = response.webDetection?.visuallySimilarImages || [];
  visuallySimilarImages.forEach((img) => {
    try {
      const parts = img.url.split("/");
      const filename = parts[parts.length - 1].toLowerCase();
      const match = filename.match(/[a-z0-9-]+/gi);
      if (match) names.push(match.join(" "));
    } catch (err) {}
  });

  // 3️⃣ Label annotations
  const labelAnnotations = response.labelAnnotations || [];
  labelAnnotations
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .forEach((l) => {
      const label = l.description.trim();
      if (!["object", "thing", "artifact", "material"].includes(label.toLowerCase())) {
        names.push(label);
      }
    });

  // 4️⃣ Logo annotations
  const logos = response.logoAnnotations || [];
  logos.forEach((l) => names.push(l.description.trim()));

  // 5️⃣ Text annotations
  const texts = response.textAnnotations || [];
  texts.forEach((t) => names.push(t.description.trim()));

  // 6️⃣ Localized object annotations
  const objects = response.localizedObjectAnnotations || [];
  objects.forEach((o) => names.push(o.name.trim()));

  // Deduplicate
  return [...new Set(names)];
};

export const handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);

    // Parse service account JSON
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

    // Write temporary key file
    const tmpPath = path.join("/tmp", "vision-key.json");
    fs.writeFileSync(tmpPath, JSON.stringify(serviceAccount));

    // Initialize Vision client
    const client = new vision.ImageAnnotatorClient({
      keyFilename: tmpPath,
    });

    // Call Vision API with all relevant features
    const [visionResponse] = await client.annotateImage({
      image: { content: imageBase64 },
      features: [
        { type: "PRODUCT_SEARCH", maxResults: 10 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "OBJECT_LOCALIZATION", maxResults: 5 },
      ],
    });

    console.log("FULL GOOGLE VISION RESPONSE:", JSON.stringify(visionResponse, null, 2));

    const possibleItemNames = extractItemNames(visionResponse.responses?.[0]);

    let products = [];
    let itemNameUsed = "Unknown item";

    // Try each label until RapidAPI returns products
    for (const name of possibleItemNames) {
      const rapidApiUrl = new URL(
        `https://${process.env.VITE_REACT_APP_RAPIDAPI_HOST}/search`
      );
      rapidApiUrl.search = new URLSearchParams({
        q,
        country: "gb",
        language: "en",
        limit: "10",
        sort_by: "LOWEST_PRICE",
      }).toString();

      const rapidResponse = await fetch(rapidApiUrl.toString(), {
        headers: {
          "X-RapidAPI-Key": process.env.VITE_REACT_APP_RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.VITE_REACT_APP_RAPIDAPI_HOST,
        },
      });

      if (!rapidResponse.ok) continue;

      const json = await rapidResponse.json();
      products =
        json?.data?.products || json?.products || json?.items || [];

      if (products.length > 0) {
        itemNameUsed = name;
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName: itemNameUsed, data: products }),
    };
  } catch (err) {
    console.error("Error in analyzeImage handler:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};