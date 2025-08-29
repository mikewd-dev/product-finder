import axios from "axios";
import heic2any from "heic2any";

// Utility to extract item name from Vision API response
const extractItemNameFromResponse = (response) => {
  const fullText = response?.data?.responses?.[0]?.fullTextAnnotation?.text;
  return fullText || "Unknown Item";
};

// Utility to transform RapidAPI response
const modifyData = (products) => {
  if (!Array.isArray(products)) return [];

  return products.map((product) => {
    const shippingValue = product.offer?.shipping || 0;
    const imagesValue = Array.isArray(product.product_photos)
      ? product.product_photos
      : [product.product_photos];

    return {
      name: product.product_title,
      description: product.product_description,
      retailer: product.offer?.store_name,
      rating: product.offer?.store_rating,
      price: product.offer?.price?.replace(/£/g, "") || "0",
      shipping: shippingValue,
      link: product.offer?.offer_page_url,
      images: imagesValue,
    };
  });
};

// Main handler
export const handleImageUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading
) => {
  try {
    setError(null);
    setLoading(true);

    // Convert HEIC if needed
    let convertedImage = imageFile;
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      convertedImage = await heic2any({ blob: imageFile });
    }

    // Read file as base64
    const imageContent = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(convertedImage);
    });

    // Call Google Vision API
    const visionApiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;
    const visionResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
      {
        requests: [
          {
            image: { content: imageContent },
            features: [
              { type: "PRODUCT_SEARCH", maxResults: 10 },
              { type: "LABEL_DETECTION", maxResults: 5 },
              { type: "LOGO_DETECTION", maxResults: 5 },
              { type: "TEXT_DETECTION", maxResults: 5 },
            ],
          },
        ],
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const itemName = extractItemNameFromResponse(visionResponse);
    setProductName(itemName);

    if (!itemName || itemName === "Unknown Item") {
      setError("Could not extract item name from image.");
      return null;
    }

    // Call RapidAPI
    const rapidOptions = {
      method: "GET",
      url: "https://real-time-product-search.p.rapidapi.com/search",
      params: {
        q: itemName,
        country: "gb",
        language: "en",
        limit: 29,
        sort_by: "LOWEST_PRICE",
      },
      headers: {
        "X-RapidAPI-Key": import.meta.env.VITE_REACT_APP_RAPIDAPI_KEY,
        "X-RapidAPI-Host": import.meta.env.VITE_REACT_APP_RAPIDAPI_HOST,
      },
    };

    let rapidResponse;
    try {
      rapidResponse = await axios.request(rapidOptions);
    } catch (error) {
      const status = error?.response?.status || "Unknown";
      const data = error?.response?.data || error.message;
      setError(`RapidAPI failed (status ${status}): ${JSON.stringify(data)}`);
      return null;
    }

    if (!rapidResponse?.data?.data) {
      setError("RapidAPI returned no data.");
      return null;
    }

    return modifyData(rapidResponse.data.data);
  } catch (error) {
    console.error("General handleImageUpload error:", error);
    setError(`Image handling failed: ${error.message || error}`);
    return null;
  } finally {
    setLoading(false);
  }
};