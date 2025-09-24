import { modifyData } from "./imageHandlingAndApiCall";

export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  try {
    setLoading(true);

    // 1️⃣ Convert file to Base64
    const reader = new FileReader();
    const analyzeResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject(new Error("Failed to read image"));
          const imageBase64 = reader.result.split(",")[1];
          const fileType = imageFile.type;

          // 2️⃣ Call Netlify function (send base64 + type)
          const response = await fetch("/.netlify/functions/analyzeImage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64, fileType }),
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

    // 3️⃣ Extract result
    const itemName = analyzeResponse.itemName || "Unknown item";
    setProductName(itemName);

    if (!analyzeResponse.products || analyzeResponse.products.length === 0) {
      setError("No products found for this item.");
      return [];
    }

    // 4️⃣ Shape products for frontend
    return modifyData(analyzeResponse.products);

  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err.message || String(err));
    return [];
  } finally {
    setLoading(false);
  }
};