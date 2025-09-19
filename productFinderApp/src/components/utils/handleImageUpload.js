import heic2any from "heic2any";
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

export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  try {
    setLoading(true);

    let convertedImage = imageFile;
    if (imageFile && [!"image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      convertedImage = await heic2any({ blob: imageFile });
    }

    const reader = new FileReader();
    const analyzeResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject("Failed to read image");
          const imageBase64 = reader.result.split(",")[1];

          const response = await fetch("/.netlify/functions/analyzeImage", {
            method: "POST",
            body: JSON.stringify({ imageBase64 }),
          });

          const data = await response.json();
          console.log("analyzeImage response:", data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject("Failed to read image file");
      reader.readAsDataURL(convertedImage);
    });

    const itemName = analyzeResponse.itemName || "Unknown item";
    setProductName(itemName);

    if (!analyzeResponse.data || analyzeResponse.data.length === 0) {
      setError("No products found for this item.");
      return [];
    }

    return modifyData(analyzeResponse.data);

  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err);
    return [];
  } finally {
    setLoading(false);
  }
};