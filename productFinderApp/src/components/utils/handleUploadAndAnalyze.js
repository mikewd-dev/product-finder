import { handleImageUpload } from "./imageHandlingAndApiCall";

// This function will run when you click "Upload and Analyze"
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

    // 🔹 Do the Vision + RapidAPI flow
    const products = await handleImageUpload(
      imageFile,
      setProductName,
      setError,
      setLoading
    );

    console.log("🔍 Raw products from API:", products);

    // 🔹 Normalize product data for UI
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

    console.log("✅ Cleaned Products (UI-ready):", cleanedProducts);

    setProductData(cleanedProducts);

    // 🔹 Example AnalysisResults normalization (Google Vision)
    // If Vision returns empty, make sure you still give the UI something predictable
    const normalizedAnalysis = {
      pagesWithMatchingImages:
        products?.pagesWithMatchingImages?.map((page, i) => ({
          id: i,
          url: page.url,
        })) || [],
      visuallySimilarImages:
        products?.visuallySimilarImages?.map((img, i) => ({
          id: i,
          url: img.url,
        })) || [],
    };

    console.log("✅ Normalized AnalysisResults:", normalizedAnalysis);

    setAnalysisResults(normalizedAnalysis);
  } catch (err) {
    console.error("❌ handleUploadAndAnalyze error:", err);
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};