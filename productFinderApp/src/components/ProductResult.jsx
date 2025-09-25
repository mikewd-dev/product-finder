import React, { useState, useRef } from "react";
import DragNDrop from "./DragNDrop";
import ProductGrid from "./ProductGrid";
import { useDrag } from "react-dnd";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import ProductCarousel from "./ProductCarousel";
import { handleUpload } from "./utils/handleUploadAndAnalyze";
import AnalysisResults from "./AnalysisResultsDisplay";

const ProductResult = ({ inputImageFile = null }) => {
  const [productName, setProductName] = useState("");
  const [ visionLabel, setVisionLabel] = useState("");
  const [productData, setProductData] = useState(null);
  const [visionData, setVisionData] = useState(null)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(inputImageFile);
  const [analysisResults, setAnalysisResults] = useState(null);

  const imageFileRef = useRef(imageFile);

  // Wrapper for upload + analyze
  const handleImageUploadWrapper = async (file) => {
    handleUpload (
      file,
      setProductName,
      setVisionLabel, 
      setVisionData,
      setError,
      setLoading,
      setProductData,
      setAnalysisResults
    );
  };

  // Handle image drop (no conversion here!)
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
    drop: handleImageDrop, // ✅ Pass function, not object
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
        {error && <p>Error: {error}</p>}
        {productData && Array.isArray(productData) && productData.length > 0 && (
          <div>
            <ProductCarousel products={productData} />
            <ProductGrid products={productData} />
          </div>
        )}
        <AnalysisResults analysisResults={analysisResults} />
      </div>
    </>
  );
};

export default ProductResult;