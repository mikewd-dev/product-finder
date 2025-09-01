import axios from "axios";
import heic2any from "heic2any";
import { imageFileResizer } from "react-image-file-resizer";

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

export const extractItemNameFromResponse = (response, setProductName) => {
  try {
    const text =
      response?.data?.responses?.[0]?.fullTextAnnotation?.text ?? "Unknown Item";
    setProductName(text);
    return text;
  } catch (err) {
    console.error("Error extracting text:", err);
    return "Unknown Item";
  }
};


const fetchData = async (itemName, setLoading, setProductData, setError) => {
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


export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  try {
    let convertedImage = imageFile;

    // Convert HEIC images
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      convertedImage = await heic2any({ blob: imageFile });
    }

    const reader = new FileReader();

    const visionApiResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject("Failed to read image");
          const imageContent = reader.result.split(",")[1];
          const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;

          const response = await axios.post(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
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

          resolve(response);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject("Failed to read image file");
      reader.readAsDataURL(convertedImage);
    });

    const itemName = extractItemNameFromResponse(visionApiResponse, setProductName);
    setProductName(itemName);

    const apiResponse = await fetchData(itemName, setLoading, setProductName, setError);

    return modifyData(apiResponse.data);
  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err);
    return [];
  }
};