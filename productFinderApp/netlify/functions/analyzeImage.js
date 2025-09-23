import { google } from "googleapis";
import fetch from "node-fetch";

// Helper to extract item names from Google Vision response
const extractItemNames = (visionResponse) => {
  if (!visionResponse) return [];

  const names = [];

  if (visionResponse.webDetection?.bestGuessLabels?.length) {
    visionResponse.webDetection.bestGuessLabels.forEach((labelObj) => {
      if (labelObj.label) names.push(labelObj.label.trim());
    });
  }

  if (names.length === 0 && visionResponse.labelAnnotations?.length) {
    visionResponse.labelAnnotations.forEach((labelObj) => {
      if (labelObj.description) names.push(labelObj.description.trim());
    });
  }

  return [...new Set(names)];
};

export const handler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No request body found" }),
      };
    }

    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "No imageBase64 provided" }) };
    }

    // ---- Google Vision API ----
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-vision"],
    });
    const client = await auth.getClient();
    const vision = google.vision({ version: "v1", auth: client });

    const [visionResponse] = await vision.images.annotate({
      requestBody: {
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "LABEL_DETECTION", maxResults: 5 }],
          },
        ],
      },
    });

    const possibleItemNames = extractItemNames(visionResponse.responses?.[0] || {});
    const itemName = possibleItemNames[0] || "Unknown item";
    console.log("Item name from Vision API:", itemName);

    // ---- RapidAPI Product Search ----
    let products = [];
    if (itemName !== "Unknown item") {
      const rapidKey = process.env.VITE_REACT_APP_RAPIDAPI_KEY;
      const rapidHost = process.env.VITE_REACT_APP_RAPIDAPI_HOST;

      if (rapidKey && rapidHost) {
        const rapidApiUrl = `https://${rapidHost}/products/search?query=${encodeURIComponent(
          itemName
        )}`;

        try {
          const rapidRes = await fetch(rapidApiUrl, {
            headers: {
              "X-RapidAPI-Key": rapidKey,
              "X-RapidAPI-Host": rapidHost,
            },
          });

          if (rapidRes.ok) {
            const rapidData = await rapidRes.json();
            products = rapidData.products || [];
          } else {
            const text = await rapidRes.text();
            console.warn("RapidAPI error:", text);
          }
        } catch (err) {
          console.error("Error fetching RapidAPI:", err);
        }
      } else {
        console.warn("RapidAPI credentials missing, skipping product fetch");
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        itemName,
        products,
      }),
    };
  } catch (err) {
    console.error("analyzeImage function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Something went wrong" }),
    };
  }
};