import vision from "@google-cloud/vision";
import fetch from "node-fetch";

// 🔹 Extract possible item names from Google Vision
const extractItemNames = (visionResponse) => {
  const names = [];

  if (!visionResponse) return names;

  const bestGuess =
    visionResponse?.webDetection?.bestGuessLabels?.[0]?.label?.trim();
  if (bestGuess) names.push(bestGuess);

  const labelAnnotation =
    visionResponse?.labelAnnotations?.[0]?.description?.trim();
  if (labelAnnotation) names.push(labelAnnotation);

  return [...new Set(names)]; // remove duplicates
};

export const handler = async (event) => {
  try {
    const { imageBase64 } = JSON.parse(event.body);

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No image data provided" }),
      };
    }

    // 🔹 Step 1: Parse service account from env and init Vision client
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

    const client = new vision.ImageAnnotatorClient({
      credentials: serviceAccount,
    });

    // 🔹 Step 2: Call Google Vision
    const [visionResponse] = await client.annotateImage({
      image: { content: imageBase64 },
      features: [
        { type: "WEB_DETECTION", maxResults: 5 },
        { type: "LABEL_DETECTION", maxResults: 5 },
      ],
    });

    console.log(
      "Google Vision response:",
      JSON.stringify(visionResponse, null, 2)
    );

    const possibleItemNames = extractItemNames(visionResponse);
    console.log("possibleItemNames from Vision API:", possibleItemNames);

    // 🔹 Step 3: Query RapidAPI
    let products = [];
    let itemNameUsed = "Unknown item";

    for (const name of possibleItemNames) {
      console.log("Querying RapidAPI with:", name);

      const rapidApiUrl = new URL(
        `https://${process.env.VITE_REACT_APP_RAPIDAPI_HOST}/search`
      );
      rapidApiUrl.search = new URLSearchParams({
        q: name,
        country: "gb",
        language: "en",
        limit: "10",
        sort_by: "LOWEST_PRICE",
      }).toString();

      const rapidResponse = await fetch(rapidApiUrl.toString(), {
        headers: {
          "X-RapidAPI-Key": process.env.VITE_REACT_APP_RAPIDAPI_KEY,
          "X-RapidAPI-Host": process.env.VITE_REACT_APP_RAPIDAPI_HOST,
        },
      });

      if (!rapidResponse.ok) {
        console.log(
          "RapidAPI request failed:",
          rapidResponse.status,
          rapidResponse.statusText
        );
        continue;
      }

      const json = await rapidResponse.json();
      console.log("RapidAPI raw response:", JSON.stringify(json, null, 2));

      products = json?.data?.products || json?.products || json?.items || [];

      if (products.length > 0) {
        itemNameUsed = name;
        break;
      }
    }

    console.log("Final products array:", products);
    console.log("Item name used:", itemNameUsed);

    // 🔹 Step 4: Return response
    return {
      statusCode: 200,
      body: JSON.stringify({
        itemName: itemNameUsed,
        data: products,
      }),
    };
  } catch (error) {
    console.error("Serverless function error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};