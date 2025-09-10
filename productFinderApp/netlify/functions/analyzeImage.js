import fetch from "node-fetch";

export const handler = async (event) => {
  console.log("⚡ analyzeImage function triggered");

  try {
    if (!event.body) {
      console.error("No request body found");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body is missing" }),
      };
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (err) {
      console.error("Failed to parse JSON body:", err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" }),
      };
    }

    const { imageBase64 } = parsedBody;

    if (!imageBase64) {
      console.error("imageBase64 not provided");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "imageBase64 field is required" }),
      };
    }

    const GOOGLE_VISION_API = process.env.GOOGLE_VISION_API;
    if (!GOOGLE_VISION_API) {
      console.error("GOOGLE_VISION_API environment variable not set");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server misconfiguration: missing API key" }),
      };
    }

    console.log("📡 Sending request to Google Vision API...");

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

    if (!response.ok) {
      console.error("Google Vision API returned error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error || "Google Vision API error" }),
      };
    }

    console.log("Google Vision API response received");
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Unexpected server error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};