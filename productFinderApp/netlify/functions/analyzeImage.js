const vision = require("@google-cloud/vision");

const decodedCredentials = Buffer.from(
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  "base64"
).toString("utf-8");

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(decodedCredentials),
});

exports.handler = async function (event) {
  try {
    const { imageUrl, imageBase64 } = JSON.parse(event.body || "{}");

    if (!imageUrl && !imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing imageUrl or imageBase64 in request body" }),
      };
    }

    // Prepare image source
    const image = imageUrl
      ? { source: { imageUri: imageUrl } }
      : { content: Buffer.from(imageBase64, "base64") };

    const request = {
      image,
      features: [
        { type: "PRODUCT_SEARCH", maxResults: 10 },
        { type: "LABEL_DETECTION", maxResults: 5 },
        { type: "LOGO_DETECTION", maxResults: 5 },
        { type: "TEXT_DETECTION", maxResults: 5 },
        { type: "WEB_DETECTION", maxResults: 5 },
      ],
    };

    const [result] = await client.annotateImage(request);

    const labels = result.labelAnnotations?.map(l => l.description) || [];
    const texts = result.textAnnotations?.map(t => t.description) || [];
    const combined = [...texts, ...labels];

    // 🔑 Attempt RapidAPI only if we got something
    let products = [];
    if (combined.length > 0) {
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;

      if (rapidHost && rapidKey) {
        const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(combined[0])}`;
        const rapidRes = await fetch(rapidApiUrl, {
          headers: {
            "X-RapidAPI-Key": rapidKey,
            "X-RapidAPI-Host": rapidHost,
          },
        });
        const rapidData = await rapidRes.json();
        products = rapidData.products || [];
      }
    }

    // 🔄 Normalize output so frontend *always* gets `products`
    if (products.length === 0) {
      products = combined.map(name => ({
        name,
        source: "vision",
      }));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ products }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};