import axios from "axios";
import heic2any from "heic2any";
import { imageFileResizer } from "react-image-file-resizer";
import { formatError } from "./utils";

const modifyData = (products) => {
  let modifiedData = [];
  products.map((product) => {
    const shippingValue = product.offer.shipping ? product.offer.shipping : 0;
    const imagesValue = Array.isArray(product.product_photos)
      ? product.product_photos
      : [product.product_photos];

    modifiedData.push({
      name: product.product_title,
      description: product.product_description,
      retailer: product.offer.store_name,
      rating: product.offer.store_rating,
      price: product.offer.price.replace(/£/g, ""),
      shipping: shippingValue,
      link: product.offer.offer_page_url,
      images: imagesValue,
    });
  });
  return modifiedData;
};

// Extract item name from multiple Vision API features
const extractItemNameFromResponse = (response, setProductName) => {
  const resp = response?.data?.responses?.[0];
  let itemName = "Unknown Item";

  // 1. Try productSearchResults
  if (resp?.productSearchResults?.results?.length) {
    itemName = resp.productSearchResults.results[0].product.displayName;
  }
  // 2. Fallback to LABEL_DETECTION
  else if (resp?.labelAnnotations?.length) {
    itemName = resp.labelAnnotations[0].description;
  }
  // 3. Fallback to LOGO_DETECTION
  else if (resp?.logoAnnotations?.length) {
    itemName = resp.logoAnnotations[0].description;
  }
  // 4. Optional: use TEXT_DETECTION if present
  else if (resp?.fullTextAnnotation?.text) {
    itemName = resp.fullTextAnnotation.text;
  }

  setProductName(itemName);
  return itemName;
};

export const handleImageUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading
) => {
  const fetchData = async (itemName) => {
    if (!itemName || itemName === "Unknown Item") {
      setError("Could not detect a valid item from the image.");
      return null;
    }

    const options = {
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

    try {
      setLoading(true);
      const response = await axios.request(options);
      console.log("RapidAPI response:", response.data);
      return response.data;
    } catch (error) {
      setError(formatError(error));
      console.error("Error fetching data:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  try {
    let convertedImage = imageFile;
    if (!imageFile.type.startsWith("image/svg+xml") &&
        !imageFile.type.startsWith("image/png") &&
        !imageFile.type.startsWith("image/jpeg")) {
      convertedImage = await heic2any({ blob: imageFile });
    }

    const reader = new FileReader();

    const visionApiResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        const imageContent = reader.result.split(",")[1];
        console.log("Base64 image length:", imageContent.length);

        const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;
        const visionApiEndpoint = "https://vision.googleapis.com/v1/images:annotate";

        try {
          const response = await axios.post(
            `${visionApiEndpoint}?key=${apiKey}`,
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
          console.log("Vision API response received");
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(convertedImage);
    });

    const itemName = extractItemNameFromResponse(visionApiResponse, setProductName);
    console.log("Final itemName used for search:", itemName);

    const fetchResponse = await fetchData(itemName);
    if (!fetchResponse) return null;

    return modifyData(fetchResponse.data);
  } catch (error) {
    setError(formatError(error));
    console.error("Error handling image:", error);
    return null;
  }
};