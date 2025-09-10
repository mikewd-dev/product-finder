const axios = require("axios");

exports.handler = async function(event, context) {
  try {
    const { imageBase64 } = JSON.parse(event.body);

    const googleResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_API_KEY}`,
      {
        requests: [
          {
            image: { content: imageBase64 },
            features: [
              { type: "LABEL_DETECTION", maxResults: 5 },
              { type: "TEXT_DETECTION", maxResults: 5 },
            ],
          },
        ],
      }
    );

    const labels = googleResponse.data.responses[0].labelAnnotations || [];
    const texts = googleResponse.data.responses[0].textAnnotations || [];
    const combinedData = `${labels.map(l => l.description).join(" ")} ${texts.map(t => t.description).join(" ")}`;

    // RapidAPI request
    const rapidApiResponse = await axios.post(
      process.env.RAPIDAPI_URL,
      { query: combinedData },
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(rapidApiResponse.data),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};