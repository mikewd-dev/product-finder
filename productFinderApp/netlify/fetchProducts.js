import axios from "axios";

export async function handler(event) {
  try {
    const itemName = event.queryStringParameters.q;
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

    const response = await axios.get(
      "https://real-time-product-search.p.rapidapi.com/search",
      {
        params: { q: itemName, country: "gb", language: "en", limit: 29, sort_by: "LOWEST_PRICE" },
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      }
    );

    return { statusCode: 200, body: JSON.stringify(response.data) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}