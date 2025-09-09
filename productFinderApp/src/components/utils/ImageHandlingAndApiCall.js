import axios from "axios";
import heic2any from "heic2any";
import { imageFileResizer } from "react-image-file-resizer";

// Safely modify and normalize product data
export const modifyData = (products = []) => {
  if (!Array.isArray(products)) return [];

  return products.map((product) => {
    const shippingValue = product?.offer?.shipping ?? 0;
    const imagesValue = Array.isArray(product?.product_photos)
      ? product.product_photos
      : [product?.product_photos].filter(Boolean);

    return {
      name: product?.product_title ?? "Unknown",
      description: product?.product_description ?? "",
      retailer: product?.offer?.store_name ?? "Unknown",
      rating: product?.offer?.store_rating ?? 0,
      price: product?.offer?.price?.replace(/£/g, "") ?? "0",
      shipping: shippingValue,
      link: product?.offer?.offer_page_url ?? "",
      images: imagesValue,
    };
  });
};

// Extract item name from Vision API response, safely using multiple fields
export const extractItemNameFromResponse = (response, setProductName) => {
  let extractedText = response?.data?.responses?.[0]?.fullTextAnnotation?.text;

  // fallback to textAnnotations if fullTextAnnotation is empty
  if (!extractedText) {
    const textAnnotations = response?.data?.responses?.[0]?.textAnnotations;
    if (textAnnotations?.length > 0) {
      extractedText = textAnnotations.map((a) => a.description).join(" ");
    }
  }

  // fallback to logos if no text
  if (!extractedText) {
    const logos = response?.data?.responses?.[0]?.logoAnnotations;
    if (logos?.length > 0) {
      extractedText = logos[0].description;
    }
  }

  // final fallback
  if (!extractedText) extractedText = "Unknown Item";

  setProductName(extractedText);
  return extractedText;
};

// Fetch data from RapidAPI safely
const fetchData = async (itemName, setLoading, setError) => {
  const options = {
    method: "GET",
    url: "https://real-time-product-search.p.rapidapi.com/search",
    params: { q: itemName, country: "gb", language: "en", limit: 29, sort_by: "LOWEST_PRICE" },
    headers: {
      "X-RapidAPI-Key": import.meta.env.VITE_REACT_APP_RAPIDAPI_KEY,
      "X-RapidAPI-Host": import.meta.env.VITE_REACT_APP_RAPIDAPI_HOST,
    },
  };

  try {
    setLoading(true);
    const response = await axios.request(options);
    return response.data ?? { data: [] };
  } catch (error) {
    console.error("Error fetching product data:", error);
    setError(error);
    return { data: [] };
  } finally {
    setLoading(false);
  }
};

// Main image upload handler
export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  try {
    let convertedImage = imageFile;
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      convertedImage = await heic2any({ blob: imageFile });
    }

    const reader = new FileReader();

    const visionApiResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject("Failed to read image");
          const imageContent = reader.result.split(",")[1];

          // Call Netlify Function instead of Google Vision directly
          const response = await fetch("/.netlify/functions/analyzeImage", {
            method: "POST",
            body: JSON.stringify({ imageBase64: imageContent }),
          });
          const data = await response.json();
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject("Failed to read image file");
      reader.readAsDataURL(convertedImage);
    });

    const itemName = extractItemNameFromResponse({ data: { responses: [visionApiResponse] } }, setProductName);

    // Call Netlify Function for product search
    const apiResponse = await fetch(`/.netlify/functions/fetchProducts?q=${encodeURIComponent(itemName)}`);
    const productsData = await apiResponse.json();

    return modifyData(productsData.data);
  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err);
    return [];
  }
};