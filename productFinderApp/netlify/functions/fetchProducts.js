import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    const q = event.queryStringParameters?.q?.trim();

    if (!q) {
      console.warn("fetchProducts called without a query. Returning empty array.");
      return {
        statusCode: 200,
        body: JSON.stringify({ data: [] }),
      };
    }

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      throw new Error("RapidAPI key or host not set in environment variables.");
    }

    const url = new URL(`https://${RAPIDAPI_HOST}/search`);
    url.search = new URLSearchParams({
      q: itemName,
      country: "gb",
      language: "en",
      limit: "2",
      sort_by: "LOWEST_PRICE",
    }).toString();

    console.log("📡 RapidAPI Request URL:", url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ RapidAPI error response:", errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `RapidAPI request failed: ${errorText}` }),
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("RapidAPI handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};