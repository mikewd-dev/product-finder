// This takes an image file, converts to base64, sends to Netlify function
export const handleUpload = async (file) => {
  try {
    const base64Image = await convertToBase64(file);

    const response = await fetch("/.netlify/functions/analyzeImage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze image");
    }

    const data = await response.json();
    return data; // contains visionData (labels + texts)
  } catch (error) {
    console.error("handleUpload error:", error);
    return null;
  }
};

// Helper to turn file into base64
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]); // strip prefix
    reader.onerror = (error) => reject(error);
  });
};