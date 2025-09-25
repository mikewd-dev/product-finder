// utils/handleUploadAndAnalyze.js
export const handleUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading
) => {
  setLoading(true);
  setError(null);

  try {
    // Convert image to Base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!reader.result) return reject("Failed to read image file");
        resolve(reader.result.split(",")[1]);
      };
      reader.onerror = () => reject("Error reading image file");
      reader.readAsDataURL(imageFile);
    });

    // Call Netlify function
    const response = await fetch("/.netlify/functions/analyzeImage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64Data }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Function error: ${text}`);
    }

    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      setError("No products found for this item.");
      return [];
    }

    setProductName(data.itemName || "Unknown item");

    // Return products for rendering
    return data.products;
  } catch (err) {
    console.error("handleUpload error:", err);
    setError(err.message || String(err));
    return [];
  } finally {
    setLoading(false);
  }
};

// Optional helper: format products for frontend
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