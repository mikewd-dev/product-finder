
import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import Modal from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';
import '../../styles/ProductCard.css'

function ImageCarousel({ images }) {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

  useEffect(() => {
    const loadImages = async () => {
      const loadImage = (image) =>
        new Promise((resolve) => {
          const img = new Image();
          img.src = image;
          img.onload = () => resolve(img);
        });
  
      const loadedImages = await Promise.all(images.map((image) => loadImage(image)));
  
      const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  
      const maxCappedWidth = viewportWidth / 2;
      const maxCappedHeight = viewportHeight / 1.5;
  
      let maxWidth = 0;
      let maxHeight = 0;
  
      loadedImages.forEach((img) => {
        const aspectRatio = img.width / img.height;
  
        const widthToFit = Math.min(maxCappedWidth, img.width);
        const heightToFit = widthToFit / aspectRatio;
  
        const heightToFitWithinMaxHeight = Math.min(maxCappedHeight, heightToFit);
        const widthToFitWithinMaxHeight = heightToFitWithinMaxHeight * aspectRatio;
  
        maxWidth = Math.min(maxCappedWidth, widthToFitWithinMaxHeight);
        maxHeight = heightToFitWithinMaxHeight;
      });
  
      document.documentElement.style.setProperty('--modal-max-width', `${maxWidth}px`);
      document.documentElement.style.setProperty('--modal-max-height', `${maxHeight}px`);
    };
  
    loadImages();
  }, [images]);
  

  const openFullscreen = (index) => {
    setFullscreenImageIndex(index);
    setIsFullscreenOpen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreenOpen(false);
  };

  return (
    <>
      <Slider dots={true} infinite={true} speed={500} slidesToShow={1} slidesToScroll={1}>
        {images.map((image, index) => (
          <div key={index} className="product-image-container" onClick={() => openFullscreen(index)}>
            <img className="product-image" src={image} alt={`Product Image ${index + 1}`} />
          </div>
        ))}
      </Slider>

      {isFullscreenOpen && (
        <div className="modal-overlay">
          <Modal
            open={isFullscreenOpen}
            onClose={closeFullscreen}
            center
            styles={{
              modal: {
                maxWidth: 'var(--modal-max-width)',
                maxHeight: 'var(--modal-max-height)',
              },
              modalImage: {
                height: '100%', // Set to 100% to fill the modal
                width: '100%', // Set to 100% to fill the modal
              },
            }}
          >
            <Slider dots={true} infinite={true} speed={500} slidesToShow={1} slidesToScroll={1} initialSlide={fullscreenImageIndex}>
              {images.map((image, index) => (
                <div key={index} className="product-modal-image-container">
                  <img
                    className="product-image"
                    src={image} 
                    alt={`Product Image ${index + 1}`}
                    style={{ height: '100%', width: '100%', borderRadius: 0, }}
                  />
                </div>
              ))}
            </Slider>
          </Modal>
        </div>
      )}
    </>
  );
}

export default ImageCarousel;
