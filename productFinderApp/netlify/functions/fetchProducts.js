import fetch from 'node-fetch';

export async function handler(event, context) {
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

  const productQuery = event.queryStringParameters.q; // e.g., product name

  const response = await fetch(`https://${RAPIDAPI_HOST}/search?q=${productQuery}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST
    }
  });

  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}