import axios from "axios";

export async function handler(event) {
  try {
    const { imageBase64 } = JSON.parse(event.body);
    const apiKey = process.env.GOOGLE_VISION_API;

    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        requests: [
          {
            image: { content: imageBase64 },
            features: [
              { type: "PRODUCT_SEARCH", maxResults: 10 },
              { type: "LABEL_DETECTION", maxResults: 5 },
              { type: "LOGO_DETECTION", maxResults: 5 },
              { type: "TEXT_DETECTION", maxResults: 5 },
            ],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    return { statusCode: 200, body: JSON.stringify(response.data) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}