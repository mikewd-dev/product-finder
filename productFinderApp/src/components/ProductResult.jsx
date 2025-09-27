import React, { useState, useRef } from "react";
import DragNDrop from "./DragNDrop";
import ProductGrid from "./ProductGrid";
import ProductCarousel from "./ProductCarousel";
import AnalysisResults from "./AnalysisResultsDisplay";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import { handleUpload } from "./utils/handleUploadAndAnalyze";

const ProductResult = ({ inputImageFile = null }) => {
  const [productName, setProductName] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(inputImageFile);
  const [analysisResults, setAnalysisResults] = useState([]);

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
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onloadend = () => reader.result ? resolve(reader.result.split(",")[1]) : reject("Failed to read image");
        reader.onerror = () => reject("Error reading image file");
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

  const handleImageDrop = (item) => {
    setImageFile(item.imageFile);
    handleImageUploadWrapper(item.imageFile);
  };

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.IMAGE,
    item: { type: ItemTypes.IMAGE, imageFile },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.IMAGE,
    drop: handleImageDrop,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <>
      <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: "move" }}>
        {imageFile && (
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Dragged"
            style={{ width: "100%", height: "auto" }}
          />
        )}
        <DragNDrop
          text={productName}
          dragType={ItemTypes.IMAGE}
          onDrop={handleImageUploadWrapper}
        />
      </div>

      <div ref={drop}>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {products.length > 0 ? (
          <>
            <ProductCarousel products={products} />
            <ProductGrid products={products} />
          </>
        ) : (
          !loading && <p>No products found</p>
        )}

        <AnalysisResults analysisResults={analysisResults} />
      </div>
    </>
  );
};

export default ProductResult;