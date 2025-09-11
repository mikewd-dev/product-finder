import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    const { q } = event.queryStringParameters;

    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      throw new Error("RapidAPI key or host not set in environment variables.");
    }

    // Build URL with query params
    const url = new URL(`https://${RAPIDAPI_HOST}/search`);
    url.search = new URLSearchParams({
      q,
      country: "gb",
      language: "en",
      limit: "2",
      sort_by: "LOWEST_PRICE",
    });

    console.log("📡 RapidAPI Request:", url.toString());

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
        body: JSON.stringify({ error: errorText }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("RapidAPI error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};