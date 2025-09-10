import { handleImageUpload } from "./imageHandlingAndApiCall";

export const handleUploadAndAnalyze = async (
  selectedImage,
  setProductName,
  setError,
  setLoading,
  setProductData,
  setAnalysisResults
) => {
  if (!selectedImage) {
    alert("Please select an image first.");
    return;
  }

  try {
    setLoading(true);

    // Call handleImageUpload, which sends image to Netlify function
    const productData = await handleImageUpload(
      selectedImage,
      setProductName,
      setError,
      setLoading
    );

    setProductData(productData);

    // Optionally, clear previous analysis results
    setAnalysisResults(null);

  } catch (error) {
    console.error("Error in handleUploadAndAnalyze:", error);
    setError(error);
  } finally {
    setLoading(false);
  }
};