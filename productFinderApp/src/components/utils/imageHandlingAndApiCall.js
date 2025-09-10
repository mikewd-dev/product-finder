import heic2any from "heic2any";

// Old-style product modification (like GitHub version)
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

// Extract the best item name from Vision API response
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
    const response = await fetch(`/.netlify/functions/fetchProducts?q=${encodeURIComponent(itemName)}`);
    const data = await response.json();
    return data ?? { data: [] };
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
          const imageContent = reader.result.split(",")[1];

          // Call Netlify function for image analysis
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

    // Extract the best item name
    const itemName = extractItemNameFromResponse({ data: { responses: [visionApiResponse] } }, setProductName);

    // Call RapidAPI / fetchProducts
    const productsData = await fetchData(itemName, setLoading, setError);

    return modifyData(productsData.data);
  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err);
    return [];
  }
};