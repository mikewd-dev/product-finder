import heic2any from "heic2any";
import { modifyData, extractItemNameFromResponse } from "./utils"; // adjust import if needed

export const handleImageUpload = async (imageFile, setProductName, setError, setLoading) => {
  setLoading(true);
  setError(null);

  try {
    console.log("Starting handleImageUpload");

    // Convert HEIC or unsupported formats
    let convertedImage = imageFile;
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)) {
      console.log("Converting image from HEIC/other format...");
      convertedImage = await heic2any({ blob: imageFile });
      console.log("Conversion done:", convertedImage);
    }

    // Convert to Base64
    const reader = new FileReader();
    const imageBase64 = await new Promise((resolve, reject) => {
      reader.onload = () => {
        if (!reader.result) return reject(new Error("Failed to read image"));
        const base64 = reader.result.split(",")[1];
        console.log("Image converted to Base64");
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(convertedImage);
    });

    console.log("Base64 ready, sending to backend...");

    // Call Netlify function
    const response = await fetch("/.netlify/functions/analyzeImage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });

    console.log("Fetch completed, status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Function error: ${text}`);
    }

    const data = await response.json();
    console.log("Raw API response:", data);

    // Extract item name
    const itemName = extractItemNameFromResponse(data, setProductName);
    console.log("Item name extracted:", itemName);

    if (!data.data || data.data.length === 0) {
      setError("No products found for this item.");
      console.log("No products returned");
      return [];
    }

    const products = modifyData(data.data);
    console.log("Products returned:", products);
    return products;

  } catch (err) {
    console.error("Error in handleImageUpload:", err);
    setError(err.message || String(err));
    return [];
  } finally {
    setLoading(false);
  }
};
