// netlify/functions/analyzeImage.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { imageBase64 } = JSON.parse(event.body);
    const GOOGLE_VISION_API = process.env.GOOGLE_VISION_API;

    if (!GOOGLE_VISION_API) {
      throw new Error("Missing GOOGLE_VISION_API environment variable");
    }

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API}`,
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
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    // If Google Vision responded with an error
    if (data.error) {
      console.error("Google Vision API error:", data.error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.error }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data.responses[0]), // just send the first response
    };
  } catch (err) {
    console.error("Error in analyzeImage:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}