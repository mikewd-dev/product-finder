import axios from "axios";

export const handler = async (event) => {
  try {
    const { q } = event.queryStringParameters;

    // Ensure these environment variables are set in Netlify
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      throw new Error("RapidAPI key or host not set in environment variables.");
    }

    const url = `https://${RAPIDAPI_HOST}/search`;

    const response = await axios.get(url, {
      params: {
        q,
        country: "gb",
        language: "en",
        limit: 2,
        sort_by: "LOWEST_PRICE",
      },
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

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