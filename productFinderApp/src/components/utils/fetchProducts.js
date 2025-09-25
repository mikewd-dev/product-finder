export const fetchProductsFromImage = async (imageFile, setProductName, setError, setLoading) => {
  try {
    setLoading(true);

    // Convert image to Base64
    const reader = new FileReader();
    const analyzeResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject(new Error("Failed to read image"));
          const imageBase64 = reader.result.split(",")[1];

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
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(imageFile);
    });

    // Set item name
    setProductName(analyzeResponse.itemName || "Unknown item");

    if (!analyzeResponse.products || analyzeResponse.products.length === 0) {
      setError("No products found for this item.");
      return [];
    }

    return analyzeResponse.products;
  } catch (err) {
    console.error("fetchProductsFromImage error:", err);
    setError(err.message || "Something went wrong");
    return [];
  } finally {
    setLoading(false);
  }
};