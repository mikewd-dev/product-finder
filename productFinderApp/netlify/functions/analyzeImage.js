import axios from "axios";

export const handler = async (event) => {
  try {
    const { file } = JSON.parse(event.body); // base64 string from frontend

    const googleResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=YOUR_API_KEY`,
      {
        requests: [
          {
            image: { content: file },
            features: [
              { type: "PRODUCT_SEARCH", maxResults: 10 },
              { type: "LABEL_DETECTION", maxResults: 5 },
              { type: "LOGO_DETECTION", maxResults: 5 },
              { type: "TEXT_DETECTION", maxResults: 5 },
              { type: "WEB_DETECTION", maxResults: 5 }
            ]
          }
        ]
      }
    );

    const responses = googleResponse.data.responses[0];

    return {
      statusCode: 200,
      body: JSON.stringify({ responses }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};