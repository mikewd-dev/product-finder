import React, { useState, useRef } from "react";
import DragNDrop from "./DragNDrop";
import ProductGrid from "./ProductGrid";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import ProductCarousel from "./ProductCarousel";
import { handleUpload } from "./utils/handleUploadAndAnalyze";
import AnalysisResults from "./AnalysisResultsDisplay";

const ProductResult = ({ inputImageFile = null }) => {
  const [productName, setProductName] = useState("");
  const [productData, setProductData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(inputImageFile);
  const [analysisResults, setAnalysisResults] = useState([]);

  const imageFileRef = useRef(imageFile);

  // Wrapper for upload + analyze
  const handleImageUploadWrapper = async (file) => {
    handleUpload(
      file,
      setProductName,
      setError,
      setLoading,
      setProductData,
      setAnalysisResults
    );
  };

  // Handle image drop (no conversion here)
  const handleImageDrop = async (item) => {
    try {
      setImageFile(item.imageFile);
      handleImageUploadWrapper(item.imageFile);
    } catch (err) {
      setError(err.message || "Error processing image");
      console.error("Error processing image:", err);
    }
  };

  // Drag & drop hooks
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.IMAGE,
    item: { type: ItemTypes.IMAGE, imageFile },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
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
            alt="Dragged Image"
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

        {productData && productData.length > 0 ? (
          <div>
            <h2>Products:</h2>
            <ProductCarousel products={productData} />
            <ProductGrid products={productData} />
          </div>
        ) : (
          <p>No products found.</p>
        )}

        {analysisResults && analysisResults.length > 0 && (
          <AnalysisResults analysisResults={analysisResults} />
        )}
      </div>
    </>
  );
};

export default ProductResult;