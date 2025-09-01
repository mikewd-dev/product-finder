import axios from "axios";
import heic2any from "heic2any";
import { imageFileResizer } from "react-image-file-resizer";
import { formatError } from "./utils";

// Safely modify and normalize product data
const modifyData = (products) => {
<<<<<<< HEAD
  let modifiedData = [];
  products.map((product) => {
    const shippingValue = product.offer.shipping ? product.offer.shipping : 0;
=======
  if (!Array.isArray(products)) {
    console.warn("modifyData expected an array but got:", products);
    return [];
  }

  return products.map((product) => {
    const shippingValue = product.offer?.shipping || 0;
>>>>>>> 0123f85 (made visual changes)
    const imagesValue = Array.isArray(product.product_photos)
      ? product.product_photos
      : [product.product_photos];

<<<<<<< HEAD
    modifiedData.push({
      name: product.product_title,
      description: product.product_description,
      retailer: product.offer.store_name,
      rating: product.offer.store_rating,
      price: product.offer.price.replace(/£/g, ""),
=======
    return {
      name: product.product_title,
      description: product.product_description,
      retailer: product.offer?.store_name || "",
      rating: product.offer?.store_rating || 0,
      price: product.offer?.price?.replace(/£/g, "") || "",
>>>>>>> 0123f85 (made visual changes)
      shipping: shippingValue,
      link: product.offer?.offer_page_url || "",
      images: imagesValue,
<<<<<<< HEAD
    });
=======
    };
>>>>>>> 0123f85 (made visual changes)
  });
};

<<<<<<< HEAD
// Extract item name from multiple Vision API features
=======
// Extract item name from Vision API response
>>>>>>> 0123f85 (made visual changes)
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

<<<<<<< HEAD
=======
// Handle image upload and fetch product data
>>>>>>> 0123f85 (made visual changes)
export const handleImageUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading
) => {
<<<<<<< HEAD
  const fetchData = async (itemName) => {
    if (!itemName || itemName === "Unknown Item") {
      setError("Could not detect a valid item from the image.");
      return null;
    }

=======
  const fetchData = async (itemName, setLoading, setProductData, setError) => {
>>>>>>> 0123f85 (made visual changes)
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
<<<<<<< HEAD
      console.log("RapidAPI response:", response.data);
      return response.data;
    } catch (error) {
      setError(formatError(error));
      console.error("Error fetching data:", error);
=======
      return response.data;
    } catch (error) {
      setError(error?.response?.data || error.message || "Unknown RapidAPI error");
      console.error("Error fetching product data:", error);
>>>>>>> 0123f85 (made visual changes)
      return null;
    } finally {
      setLoading(false);
    }
  };

  try {
<<<<<<< HEAD
    let convertedImage = imageFile;
    if (!imageFile.type.startsWith("image/svg+xml") &&
        !imageFile.type.startsWith("image/png") &&
        !imageFile.type.startsWith("image/jpeg")) {
=======
    let convertedImage;

    if (
      imageFile.type.startsWith("image/svg+xml") ||
      imageFile.type.startsWith("image/png") ||
      imageFile.type.startsWith("image/jpeg")
    ) {
      convertedImage = imageFile;
    } else {
>>>>>>> 0123f85 (made visual changes)
      convertedImage = await heic2any({ blob: imageFile });
    }

    const reader = new FileReader();

<<<<<<< HEAD
    const visionApiResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        const imageContent = reader.result.split(",")[1];
        console.log("Base64 image length:", imageContent.length);

        const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;
        const visionApiEndpoint = "https://vision.googleapis.com/v1/images:annotate";
=======
    // Wrap the Vision API call in a promise
    const visionApiResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        const imageContent = reader.result.split(",")[1];
        const visionApiEndpoint = "https://vision.googleapis.com/v1/images:annotate";
        const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;
>>>>>>> 0123f85 (made visual changes)

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
<<<<<<< HEAD
          console.log("Vision API response received");
=======
>>>>>>> 0123f85 (made visual changes)
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

<<<<<<< HEAD
      reader.onerror = reject;
=======
>>>>>>> 0123f85 (made visual changes)
      reader.readAsDataURL(convertedImage);
    });

    const itemName = extractItemNameFromResponse(visionApiResponse, setProductName);
<<<<<<< HEAD
    console.log("Final itemName used for search:", itemName);

    const fetchResponse = await fetchData(itemName);
    if (!fetchResponse) return null;

    return modifyData(fetchResponse.data);
  } catch (error) {
    setError(formatError(error));
    console.error("Error handling image:", error);
    return null;
=======
    setProductName(itemName);

    const fetchResponse = await fetchData(itemName, setLoading, setProductName, setError);
    if (!fetchResponse) return [];

    // Make sure we pass an array to modifyData
    const productsArray = Array.isArray(fetchResponse.data)
      ? fetchResponse.data
      : [];

    return modifyData(productsArray);

  } catch (error) {
    setError(error?.message || "Unknown error during image upload");
    console.error("Error handling image:", error);
    return [];
>>>>>>> 0123f85 (made visual changes)
  }
};