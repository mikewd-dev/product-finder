import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import DragNDrop from "./DragNDrop";
import ProductGrid from "./ProductGrid";
import { useDrag } from "react-dnd";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import heic2any from "heic2any";
import { imageFileResizer } from "react-image-file-resizer";
import ProductCarousel from "./ProductCarousel";
import {handleImageUpload} from "./utils/imageHandlingAndApiCall"
import { handleUploadAndAnalyze } from "./utils/handleUploadAndAnalyze";
import AnalysisResults from "./AnalysisResultsDisplay";

const ProductResult = ({inputImageFile = null}) => {
  const [productName, setProductName] = useState("");
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(inputImageFile);
  const [handledImageFile, setHandledImageFile] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  
  const imageFileRef = useRef(imageFile)
 
  // Function to modify product data
 
  const handleImageUploadWrapper = async (imageFile) => {
    handleUploadAndAnalyze(imageFile, setProductName, setError, setLoading, setProductData, setAnalysisResults);
  };

  // useEffect(() => {
  //   if (imageFile !== null && imageFileRef.current === null && !handledImageFile) {
  //     handleImageUploadWrapper(imageFile);
  //     setHandledImageFile(true);
  //   } else if (imageFile === null) {
  //     setHandledImageFile(false);
  //   }
  //   imageFileRef.current = imageFile;
  // }, [imageFile, handledImageFile]);

  // Function to handle image drop
  const handleImageDrop = async (item) => {
    try {
      let jpegImage;
  
      if (
        item.imageFile.type.startsWith("image/jpeg") ||
        item.imageFile.type.startsWith("image/svg+xml") ||
        item.imageFile.type.startsWith("image/png")
      ) {
        jpegImage = await heic2any({ blob: item.imageFile });
      } else {
        jpegImage = item.imageFile;
      }
  
      const resizedImage = await new Promise((resolve) => {
        imageFileResizer(
          jpegImage,
          640,
          640,
          "JPEG",
          100,
          0,
          (uri) => resolve(uri),
          "base64"
        );
      });
  
      setImageFile(resizedImage);
  
      // Pass the updated imageFile to the handleImageUploadWrapper function
      handleImageUploadWrapper(resizedImage);
    } catch (error) {
      setError(formatError(error));
      console.error("Error processing image:", error);
    }
  };

  // Drag and drop hooks
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.IMAGE,
    item: { type: ItemTypes.IMAGE, imageFile },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.IMAGE,
    drop: {handleImageDrop},
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
        {error && <p>Error: {error.message}</p>}
        {productData && Array.isArray(productData) && productData.length > 0 && (
          <div>
            <ProductCarousel products={productData} />
            <ProductGrid products={productData} />
          </div>
        )}
        <AnalysisResults analysisResults={analysisResults}/>

      </div>
    </>
  );
};

export default ProductResult;
