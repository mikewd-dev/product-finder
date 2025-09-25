import { handleImage } from "./imageHandlingAndApiCall";

// 🔹 Dev + prod safe Netlify functions URL
const NETLIFY_FUNCTIONS_URL = import.meta.env.VITE_NETLIFY_FUNCTIONS_URL 
  || (window.location.hostname.includes("github.dev")
      ? `https://${window.location.hostname.replace(/:\d+/, '-8888')}/.netlify/functions`
      : "/.netlify/functions");

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

    // 1️⃣ Fetch products (Vision + RapidAPI)
    const products = await handleImage(
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

    // 2️⃣ Call Netlify function for Vision Web Detection
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        if (!reader.result) return;
        const base64Image = reader.result.split(",")[1];

        const response = await fetch("/.netlify/functions/analyzeImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Image, 
            features: 
              [
               { type: "WEB_DETECTION" },
               { type: "LABEL_DETECTION"},
               { type: "TEXT_DETECTION" },
               { type: "PRODUCT_SEARCH" },
              ]
            }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Function error: ${text}`);
        }

        const responseData = await response.json();
        const webDetection = responseData.responses?.[0]?.webDetection || {};
        setAnalysisResults(webDetection);
      } catch (err) {
        console.error("Vision API error:", err);
        setAnalysisResults({});
      }
    };

    reader.readAsDataURL(imageFile);

  } catch (err) {
    console.error("handleUploadAndAnalyze error:", err);
    setError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
};
