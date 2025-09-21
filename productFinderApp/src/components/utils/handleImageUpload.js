import heic2any from "heic2any";
import { modifyData, extractItemNameFromResponse } from "./utils"; // adjust path if needed

export const handleImageUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading
) => {
  setLoading(true);
  setError(null);

  try {
    console.log("🔹 Starting handleImageUpload");
    console.log("Incoming file:", imageFile);
    console.log("File type:", imageFile?.type);

    // ✅ Convert HEIC if needed
    let convertedImage = imageFile;
    if (
      imageFile &&
      !["image/png", "image/jpeg", "image/svg+xml"].includes(imageFile.type)
    ) {
      console.log("Converting from HEIC/other format...");
      convertedImage = await heic2any({ blob: imageFile });
      console.log("Conversion done:", convertedImage);
    }

    //Read as Base64 (safe fallback using ArrayBuffer)
    const imageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        console.log("FileReader onload triggered");

        if (typeof reader.result === "string") {
          // readAsDataURL case
          const base64 = reader.result.split(",")[1];
          console.log("Base64 extracted from DataURL");
          resolve(base64);
        } else if (reader.result instanceof ArrayBuffer) {
          // readAsArrayBuffer fallback
          const base64 = btoa(
            new Uint8Array(reader.result).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          console.log("Base64 extracted from ArrayBuffer");
          resolve(base64);
        } else {
          reject(new Error("Unexpected FileReader result"));
        }
      };

      reader.onerror = (err) => {
        console.error("FileReader error:", err);
        reject(new Error("Failed to read image file"));
      };

      try {
        console.log("🔹 Reading file as DataURL...");
        reader.readAsDataURL(convertedImage);
      } catch (err) {
        console.warn("readAsDataURL failed, trying ArrayBuffer...");
        reader.readAsArrayBuffer(convertedImage);
      }
    });

    console.log("Base64 ready, sending to backend...");

    // ✅ Call Netlify function
    const response = await fetch("/.netlify/functions/analyzeImage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });

    console.log("🔹 Fetch completed, status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Function error: ${text}`);
    }

    const data = await response.json();
    console.log("Raw API response:", data);

    //Extract item name
    const itemName = extractItemNameFromResponse(data, setProductName);
    console.log("🔹 Item name extracted:", itemName);

    // Normalize product data
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
