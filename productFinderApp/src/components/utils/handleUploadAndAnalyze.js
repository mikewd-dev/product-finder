import { handleImageUpload } from "./ImageHandlingAndApiCall";
import { formatError } from "./utils"; // your robust error formatter

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
    setError(null);
    setLoading(true);

    // Step 1: Upload image and fetch product data
    const productData = await handleImageUpload(
      selectedImage,
      setProductName,
      setError,
      setLoading
    );
    setProductData(productData);

    // Step 2: Convert image to Base64
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(selectedImage);
    });

    // Step 3: Call Google Vision API with both Web & Label detection
    try {
      const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;
      const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: "WEB_DETECTION", maxResults: 10 },
                { type: "LABEL_DETECTION", maxResults: 5 },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const resp = data.responses?.[0] || {};

      // Extract Web Detection and Label Detection
      const webEntities = resp.webDetection?.webEntities || [];
      const labels = resp.labelAnnotations || [];

      // Determine the best item name
      const itemName = (webEntities[0]?.description || labels[0]?.description || "Unknown Item").trim();
      setProductName(itemName);

      // Set analysis results for UI
      setAnalysisResults({ webEntities, labels });

      // Optional warning if Web Detection failed
      if (!webEntities.length) {
        console.warn("No visually similar images found via Web Detection.");
      }

      // Optional warning if nothing detected at all
      if (!itemName || itemName === "Unknown Item") {
        setError("Could not detect any recognizable object in the image.");
      }

    } catch (visionError) {
      console.error("Error in Google Vision API:", visionError);
      setAnalysisResults(null);
      setError("Google Vision API failed: " + formatError(visionError));
    }

  } catch (error) {
    console.error("Error in handleUploadAndAnalyze:", error);
    setError("Image upload and analysis failed: " + formatError(error));
  } finally {
    setLoading(false);
  }
};