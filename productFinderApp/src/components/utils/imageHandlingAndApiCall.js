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

// 🔹 Fetch product data through Netlify function
const fetchData = async (itemName, setLoading, setError) => {
  try {
    setLoading(true);
    const apiResponse = await fetch(
      `/.netlify/functions/fetchProducts?q=${encodeURIComponent(itemName)}`
    );
    const data = await apiResponse.json();
    return data ?? { data: [] };
  } catch (error) {
    console.error("Error fetching product data:", error);
    setError(error);
    return { data: [] };
  } finally {
    setLoading(false);
  }
};

// 🔹 Main image upload handler
export const handleImageUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading
) => {
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
    const itemName = extractItemNameFromResponse(
      { data: { responses: [visionApiResponse] } },
      setProductName
    );

    // Call RapidAPI via Netlify function
    const productsData = await fetchData(itemName, setLoading, setError);

    return modifyData(productsData.data);
  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err);
    return [];
  }
};