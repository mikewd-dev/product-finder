import React, { useState, useEffect } from "react";
import "../../src/styles/ImageAnalysis.css";
import ProductCarousel from "./ProductCarousel";
import ProductGrid from "./ProductGrid";
import { handleImage } from "./utils/imageHandlingAndApiCall";
import AnalysisResults from "./AnalysisResultsDisplay";


const ImageAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);

  const [productName, setProductName] = useState("");
  const [visionLabel, setVisionLabel] = useState("");
  const [productData, setProductData] = useState(null);
  const [visionData, setVisionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

const NETLIFY_FUNCTIONS_URL = import.meta.env.VITE_NETLIFY_FUNCTIONS_URL;

// useEffect(() => {
//   fetch(`${NETLIFY_FUNCTIONS_URL}/testFunction`)
//     .then(res => res.json())
//     .then(data => console.log("Test function response:", data))
//     .catch(err => console.error("Test function error:", err));
// }, []);



  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyzeWrapper = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setError(null);

    try {
      const products = await handleImage(
        selectedImage,
        setProductName,
        setVisionLabel,
        setError,
        setLoading
      );

      setProductData(products);

      // Also set analysisResults from the same data
      console.log("Products returned:", products);
      if (products.length > 0) {
        const firstProduct = products[0];
        setAnalysisResults(firstProduct.analysisResults || {}); // optional, depending on structure
      } else {
        setAnalysisResults({});
      }
    } catch (err) {
      console.error("Upload & analyze error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="center-container">
        <div className="button-container">
          <label className="file-input-container">
            <input
              type="file"
              className="file-input"
              onChange={handleImageChange}
            />
            <span className="upload-image-button">Choose File</span>
          </label>
          <button
            className="submit-upload"
            onClick={handleUploadAndAnalyzeWrapper}
          >
            Upload and Analyze Image
          </button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error.message || String(error)}</p>}

      {productData && Array.isArray(productData) && productData.length > 0 && (
        <div>
          <ProductCarousel products={productData} />
          <ProductGrid products={productData} />
        </div>
      )}

      <AnalysisResults analysisResults={analysisResults} />
    </>
  );
};

export default ImageAnalysis;
