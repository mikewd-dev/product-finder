import axios from "axios";

export const handler = async (event) => {
  try {
    const { q } = event.queryStringParameters;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const response = await axios.get(
      "https://real-time-product-search.p.rapidapi.com/search",
      {
        params: {
          q,
          country: "gb",
          language: "en",
          limit: 2,
          sort_by: "LOWEST_PRICE",
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("RapidAPI error:", error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};