
export const modifyData = (products = []) => {
  if (!Array.isArray(products)) return [];
  return products.map((product) => ({
    name: product?.product_title,
    description: product?.product_description,
    retailer: product?.store_name,
    rating: product?.store_rating,
    price: product?.price ? product.price.replace(/£/g, "") : undefined,
    shipping: product?.shipping,
    link: product?.product_offer_page_url,
    images: Array.isArray(product?.product_photo)
      ? product.product_photo
      : [product?.product_photo].filter(Boolean),
  }));
};


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


const NETLIFY_FUNCTIONS_URL =
  import.meta.env.VITE_NETLIFY_FUNCTIONS_URL || "/.netlify/functions";


export const handleImage = async (imageFile, setProductName, setError, setLoading) => {
  try {
    setLoading(true);

  
    let convertedImage = imageFile;
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      convertedImage = await heic2any({ blob: imageFile });
      if (Array.isArray(convertedImage)) convertedImage = convertedImage[0];
    }

    const reader = new FileReader();
    const analyzeResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject(new Error("Failed to read image"));
          const imageBase64 = reader.result.split(",")[1];

          const response = await fetch(`${NETLIFY_FUNCTIONS_URL}/analyzeImage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64 }),
          });

          if (!response.ok) {
            const text = await response.text();
            return reject(new Error(`Function error: ${text}`));
          }

          const data = await response.json();
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(imageFile); // ← just send the file, no conversion
    });

    extractItemNameFromResponse(analyzeResponse, setProductName);

    // 🔹 Step 3: Store ranked candidates if available
    if (setCandidates && analyzeResponse?.ranked?.length) {
      setCandidates(analyzeResponse.ranked);
    }

    // 🔹 Step 4: Shape the product data for the frontend
    if (!analyzeResponse.products || analyzeResponse.products.length === 0) {
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