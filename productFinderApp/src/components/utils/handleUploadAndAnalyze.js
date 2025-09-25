export const handleUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading,
  setProducts,
  setAnalysisResults
) => {
  setLoading(true);
  setError(null);

  try {
    // Convert image to Base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result.split(",")[1]);
        } else {
          reject(new Error("Failed to read image file"));
        }
      };
      reader.onerror = () => reject(new Error("Error reading image file"));
    });

    const response = await fetch("/.netlify/functions/analyzeImage", {
      method: "POST",
      body: JSON.stringify({ imageBase64: base64Data }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Error analyzing image");
      setProducts([]);
      setAnalysisResults([]);
      setProductName("Unknown item");
      return;
    }

    console.log("Server response:", data);

    // ✅ Use the returned fields directly
    setProductName(data.itemName || "Unknown item");
    setProducts(data.products || []);
    setAnalysisResults(data.visionLabels || []);
  } catch (err) {
    console.error("handleUpload error:", err);
    setError(err.message || "Error uploading image");
    setProducts([]);
    setAnalysisResults([]);
    setProductName("Unknown item");
  } finally {
    setLoading(false);
  }
};