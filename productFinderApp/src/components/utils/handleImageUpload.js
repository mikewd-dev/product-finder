import heic2any from "heic2any";

// Modify RapidAPI data to your format
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

// Extract item name from Vision API response
const extractItemName = (response, setProductName) => {
  if (!response) return "Unknown item";

  const webGuess = response?.webDetection?.bestGuessLabels?.[0]?.label?.trim();
  if (webGuess) {
    setProductName(webGuess);
    return webGuess;
  }

  const labelAnnotation = response?.labelAnnotations?.[0]?.description?.trim();
  if (labelAnnotation) {
    setProductName(labelAnnotation);
    return labelAnnotation;
  }

  setProductName("Unknown item");
  return "Unknown item";
};

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
    console.log("🔍 Item name extracted from Vision API:", itemName);

    const query = itemName?.trim();
    if (!query || query === "Unknown item") {
      setError("Could not detect a valid product from the image.");
      return [];
    }

    // Call RapidAPI / fetchProducts
    const apiResponse = await fetch(`/.netlify/functions/fetchProducts?q=${encodeURIComponent(query)}`);
    const productsData = await apiResponse.json();

    if (productsData.error) {
      setError(productsData.error);
      return [];
    }

    return modifyData(productsData.data);
  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err);
    return [];
  } finally {
    setLoading(false);
  }
};