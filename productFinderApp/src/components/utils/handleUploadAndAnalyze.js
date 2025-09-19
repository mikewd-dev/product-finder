import { handleImageUpload } from "./imageHandlingAndApiCall";

export const handleUploadAndAnalyze = async (
  imageFile,
  setProductName,
  setError,
  setLoading,
  setProductData,
  setAnalysisResults
) => {
  try {
    setLoading(true);
    setError(null);

    // 1️⃣ Fetch products (Vision + RapidAPI flow)
    const products = await handleImageUpload(
      imageFile,
      setProductName,
      setError,
      setLoading
    );

    // Normalize for UI
    const cleanedProducts = Array.isArray(products)
      ? products.map((p, i) => ({
          id: i,
          title: p?.name || "Untitled Product",
          description: p?.description || "",
          retailer: p?.retailer || "Unknown Store",
          rating: p?.rating ?? null,
          price: p?.price || "N/A",
          shipping: p?.shipping || "Not provided",
          link: p?.link || "#",
          image: p?.images?.[0] || "/placeholder.png",
        }))
      : [];

    setProductData(cleanedProducts);

    // 2️⃣ Call Netlify function for Vision Web Detection (like old code)
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Image = reader.result.split(",")[1];

        const response = await fetch("/.netlify/functions/analyzeImage", {
          method: "POST",
          body: JSON.stringify({
            imageBase64: base64Image,
            features: [{ type: "WEB_DETECTION" }],
          }),
        });

        const responseData = await response.json();
        console.log("Vision Web Detection:", responseData);

        const webDetection = responseData.responses?.[0]?.webDetection || {};
        setAnalysisResults(webDetection);
      } catch (err) {
        console.error("Vision API error:", err);
        setAnalysisResults({});
      }
    };

    reader.readAsDataURL(imageFile);
  } catch (err) {
    console.error("❌ handleUploadAndAnalyze error:", err);
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};