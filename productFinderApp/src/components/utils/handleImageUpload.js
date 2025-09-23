import heic2any from "heic2any";
import { modifyData } from "./imageHandlingAndApiCall";

export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  try {
    setLoading(true);

    // 1️⃣ Convert HEIC or unsupported formats
    let convertedImage = imageFile;
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      convertedImage = await heic2any({ blob: imageFile });
    }

    // 2️⃣ Convert to Base64
    const reader = new FileReader();
    const analyzeResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (!reader.result) return reject(new Error("Failed to read image"));
          const imageBase64 = reader.result.split(",")[1];

          // 3️⃣ Call Netlify function (Vision + RapidAPI)
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
      reader.readAsDataURL(convertedImage);
    });

    // 4️⃣ Use itemName from Netlify function (RapidAPI result)
    const itemName = analyzeResponse.itemName || "Unknown item";
    setProductName(itemName);

    if (!analyzeResponse.data || analyzeResponse.data.length === 0) {
      setError("No products found for this item.");
      return [];
    }

    // 5️⃣ Shape products for frontend
    return modifyData(analyzeResponse.data);

  } catch (err) {
    console.error("Error handling image upload:", err);
    setError(err.message || String(err));
    return [];
  } finally {
    setLoading(false);
  }
};