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

  const handleImageUploadWrapper = (file) => {
    handleUpload(
      file,
      setProductName,
      setError,
      setLoading,
      setProducts,
      setAnalysisResults
    );
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