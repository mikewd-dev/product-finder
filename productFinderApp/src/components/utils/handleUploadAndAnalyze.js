// utils/handleUploadAndAnalyze.js
export const handleUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading,
  setProducts,
  setAnalysisResults
) => {
  try {
    setLoading(true);
    setError(null);

    // Convert image to base64
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = async () => {
      const base64Data = reader.result.split(",")[1]; // Remove "data:image/...;base64," prefix

      const response = await fetch("/.netlify/functions/analyzeImage", {
        method: "POST",
        body: JSON.stringify({ imageBase64: base64Data }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error analyzing image");
        setProducts([]);
        return;
      }

      setProductName(data.itemName || "Unknown item");
      setProducts(data.products || []);
      setAnalysisResults(data.visionLabels || []);
    };
  } catch (err) {
    console.error("handleUpload error:", err);
    setError(err.message || "Error uploading image");
  } finally {
    setLoading(false);
  }
};