import heic2any from "heic2any";
import { modifyData, extractItemNameFromResponse } from "./utils"; // adjust import

export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  try {
    setLoading(true);

    if (!imageFile) throw new Error("No image file provided");

    // Convert HEIC or unsupported formats
    let convertedImage = imageFile;
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      const heicResult = await heic2any({ blob: imageFile });
      convertedImage = Array.isArray(heicResult) ? heicResult[0] : heicResult;
    }

    console.log("Converted image for FileReader:", convertedImage);

    // Convert image to Base64 using FileReader
    const analyzeResponse = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          if (!reader.result) return reject(new Error("Failed to read image"));
          const imageBase64 = reader.result.split(",")[1];

          // Call Netlify function
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
          console.log("Raw API response:", data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(convertedImage);
    });

    // Extract item name
    extractItemNameFromResponse(analyzeResponse, setProductName);

    if (!analyzeResponse.data || analyzeResponse.data.length === 0) {
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
