import axios from "axios";

export const handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);

    const googleResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API}`,
      {
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
      },
      { headers: { "Content-Type": "application/json" } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(googleResponse.data),
    };
  } catch (error) {
    console.error("Google Vision API error:", error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};