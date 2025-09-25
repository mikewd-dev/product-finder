// Converts a File to Base64
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]); // strip "data:*/*;base64,"
    reader.onerror = (error) => reject(error);
  });

// Upload image and call analyzeImage function
export const handleUpload = async (file, setProductName, setError, setLoading, setProductData, setAnalysisResults) => {
  setLoading(true);
  setError(null);

  try {
    const imageBase64 = await toBase64(file);

    const response = await fetch("/.netlify/functions/analyzeImage", {
      method: "POST",
      body: JSON.stringify({ imageBase64 }),
    });

    const data = await response.json();

    setProductName(data.itemName || "Unknown item");
    setProductData(data.products || []);
    setAnalysisResults(data.visionLabels || []);
  } catch (err) {
    console.error("handleUpload error:", err);
    setError(err.message || "Error analyzing image");
  } finally {
    setLoading(false);
  }
};