import heic2any from "heic2any";

// 🔹 Safely modify and normalize product data
export const modifyData = (products = []) => {
  if (!Array.isArray(products)) return [];
  return products.map((product) => ({
    name: product?.product_title,
    description: product?.product_description,
    retailer: product?.offer?.store_name,
    rating: product?.offer?.store_rating,
    price: product?.offer?.price ? product.offer.price.replace(/£/g, "") : undefined,
    shipping: product?.offer?.shipping,
    link: product?.offer?.offer_page_url,
    images: Array.isArray(product?.product_photos)
      ? product.product_photos
      : [product?.product_photos].filter(Boolean),
  }));
};

// 🔹 Extract the best item name from Vision API response
export const extractItemNameFromResponse = (visionApiResponse, setProductName) => {
  const response = visionApiResponse;

  const webGuess = response?.responses?.[0]?.webDetection?.bestGuessLabels?.[0]?.label?.trim();
  if (webGuess) {
    setProductName(webGuess);
    return webGuess;
  }

  const labelAnnotation = response?.responses?.[0]?.labelAnnotations?.[0]?.description?.trim();
  if (labelAnnotation) {
    setProductName(labelAnnotation);
    return labelAnnotation;
  }

  setProductName("Unknown item");
  return "Unknown item";
};

// 🔹 Dev + prod safe Netlify functions URL
const NETLIFY_FUNCTIONS_URL = import.meta.env.VITE_NETLIFY_FUNCTIONS_URL 
  || (window.location.hostname.includes("github.dev")
      ? `https://${window.location.hostname.replace(/:\d+/, '-8888')}/.netlify/functions`
      : "/.netlify/functions");

// 🔹 Main image upload handler
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
    const analyzeResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject(new Error("Failed to read image"));
          const imageBase64 = reader.result.split(",")[1];

          // Call Netlify function
          const response = await fetch("/.netlify/functions/analyzeImage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64 }),
          });

          if (!response.ok) {
            const text = await response.text();
            return reject(new Error(`Function error: ${text}`));
          }

          const data = await response.json();
          console.log("Raw API response:", data);
          resolve (data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(convertedImage);
    });

    // Extract item name
    const itemName = extractItemNameFromResponse(analyzeResponse, setProductName);

    if (!analyzeResponse.data || analyzeResponse.data.length === 0) {
      setError("No products found for this item.");
      return [];
    }

    return modifyData(analyzeResponse.data);

  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err.message || String(err));
    return [];
  } finally {
    setLoading(false);
  }
};
