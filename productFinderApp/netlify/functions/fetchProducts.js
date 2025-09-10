const axios = require("axios");

exports.handler = async function(event, context) {
  try {
    const { query } = JSON.parse(event.body);

    const rapidApiResponse = await axios.post(
      process.env.RAPIDAPI_URL,
      { query },
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
      body: JSON.stringify({ error: "Server error fetching products" }),
    };
  }
};