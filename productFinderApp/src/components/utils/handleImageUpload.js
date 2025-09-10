import heic2any from "heic2any";

// Old-style product modification (like GitHub version)
const modifyData = (products = []) => {
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

// Extract the best item name from Vision API response
const extractItemName = (response, setProductName) => {
  if (!response) return "Unknown item";

  // Try webDetection best guess first
  const webGuess =
    response?.webDetection?.bestGuessLabels?.[0]?.label?.trim();
  if (webGuess) {
    setProductName(webGuess);
    return webGuess;
  }

  // Fallback to first labelAnnotation
  const labelAnnotation =
    response?.labelAnnotations?.[0]?.description?.trim();
  if (labelAnnotation) {
    setProductName(labelAnnotation);
    return labelAnnotation;
  }

  // Final fallback
  setProductName("Unknown item");
  return "Unknown item";
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
            headers: { "Content-Type": "application/json" },
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

    // Extract the best item name
    const itemName = extractItemName(visionApiResponse, setProductName);

    // Call RapidAPI / fetchProducts
    const apiResponse = await fetch(
      `/.netlify/functions/fetchProducts?q=${encodeURIComponent(itemName)}`
    );
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