import axios from "axios";
import heic2any from "heic2any";

// Safely modify product data
const modifyData = (products = []) => {
  if (!Array.isArray(products)) return [];
  return products.map((product) => {
    const shipping = product?.offer?.shipping ?? 0;
    const images = Array.isArray(product?.product_photos)
      ? product.product_photos
      : [product?.product_photos].filter(Boolean);

    return {
      name: product?.product_title ?? "Unknown",
      description: product?.product_description ?? "",
      retailer: product?.offer?.store_name ?? "Unknown",
      rating: product?.offer?.store_rating ?? 0,
      price: product?.offer?.price?.replace(/£/g, "") ?? "0",
      shipping,
      link: product?.offer?.offer_page_url ?? "",
      images,
    };
  });
};

// Extract item name from Netlify function response
const extractItemName = (response, setProductName) => {
  const text = response?.itemName ?? "Unknown Item";
  setProductName(text);
  return text;
};

// Main handler
export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  try {
    setLoading(true);

    // Convert HEIC or unsupported formats
    let convertedImage = imageFile;
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      convertedImage = await heic2any({ blob: imageFile });
    }

    // Convert image to Base64
    const reader = new FileReader();
    const visionApiResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject("Failed to read image");
          const imageBase64 = reader.result.split(",")[1];

          // Call Netlify function for image analysis
          const response = await fetch("/.netlify/functions/analyzeImage", {
            method: "POST",
            body: JSON.stringify({ imageBase64 }),
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

    // Extract item name
    const itemName = extractItemName(visionApiResponse, setProductName);

    // Call Netlify function for product search
    const apiResponse = await fetch(`/.netlify/functions/fetchProducts?q=${encodeURIComponent(itemName)}`);
    const productsData = await apiResponse.json();

    return modifyData(productsData.data);
  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err);
    return [];
  } finally {
    setLoading(false);
  }
};