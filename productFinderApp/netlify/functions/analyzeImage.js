import fetch from 'node-fetch';

export async function handler(event, context) {
  const GOOGLE_VISION_API = process.env.GOOGLE_VISION_API;

  const { imageBase64 } = JSON.parse(event.body);

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'LABEL_DETECTION', maxResults: 5 }]
          }
        ]
      })
    }
  );

  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}