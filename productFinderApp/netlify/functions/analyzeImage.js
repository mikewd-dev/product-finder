import { ImageAnnotatorClient } from '@google-cloud/vision';
import fetch from 'node-fetch';
import path from 'path';

// Initialize Google Vision client with local JSON credentials
const client = new ImageAnnotatorClient({
  keyFilename: path.resolve('./google-credentials.json'), // adjust if in root
});

// Helper to extract item names from Google Vision response
const extractItemNames = (visionResponse) => {
  if (!visionResponse) return [];

  const names = [];

  if (visionResponse.webDetection?.bestGuessLabels?.length) {
    visionResponse.webDetection.bestGuessLabels.forEach(labelObj => {
      if (labelObj.label) names.push(labelObj.label.trim());
    });
  }

  if (names.length === 0 && visionResponse.labelAnnotations?.length) {
    visionResponse.labelAnnotations.forEach(labelObj => {
      if (labelObj.description) names.push(labelObj.description.trim());
    });
  }

  return [...new Set(names)];
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const imageBase64 = body.imageBase64;

    if (!imageBase64) {
      throw new Error('No image present.');
    }

    // Call Google Vision API
    const [visionRes] = await client.annotateImage({
      image: { content: imageBase64 },
      features: [
        { type: 'LABEL_DETECTION' },
        { type: 'WEB_DETECTION' },
      ],
    });

    console.log('Google Vision response:', visionRes);

    const possibleItemNames = extractItemNames(visionRes);
    console.log('possibleItemNames from Vision API:', possibleItemNames);

    const itemName = possibleItemNames[0] || 'Unknown item';

    // Call RapidAPI only if we have a valid item name
    let products = [];
    if (itemName !== 'Unknown item') {
      const rapidHost = process.env.RAPIDAPI_HOST;
      const rapidKey = process.env.RAPIDAPI_KEY;

      const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(itemName)}`;
      const rapidRes = await fetch(rapidApiUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': rapidKey,
          'X-RapidAPI-Host': rapidHost,
        },
      });

      const rapidData = await rapidRes.json();
      products = rapidData.products || [];
    }

    console.log('Final products array:', products);

    return {
      statusCode: 200,
      body: JSON.stringify({ itemName, products }),
    };
  } catch (err) {
    console.error('analyzeImage function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};