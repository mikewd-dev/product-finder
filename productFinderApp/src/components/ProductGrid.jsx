import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard/ProductCard';
import '../styles/ProductGrid.css'
const ProductGrid = ({ products }) => {
 
  const rowsPerLoad = 2;

  const [loadedRows, setLoadedRows] = useState(rowsPerLoad);
  const [itemsPerRow, setItemsPerRow] = useState(calculateItemsPerRow());
  
  function calculateItemsPerRow() {
    const breakpoint = 2000;
    return window.innerWidth < breakpoint ? 1 : 3;
  }

  useEffect(() => {
    function handleResize() {
      setItemsPerRow(calculateItemsPerRow());
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);


  const loadMoreRows = () => {
    const remainingRows = Math.ceil((products.length - loadedRows) / itemsPerRow);
    const rowsToLoad = Math.min(rowsPerLoad, remainingRows);
    setLoadedRows((prevLoadedRows) => prevLoadedRows + rowsToLoad);
  };

  const visibleProducts = products.slice(0, loadedRows * itemsPerRow);

  return (
    <section className='product-grid-section'>
    <header className='section-title'>
      <h2>Similar Products</h2>
      <p>Found {products.length} products</p>
      </header>
      {Array.from({ length: loadedRows }).map((_, rowIndex) => (
        <div key={rowIndex} className="product-grid-row">
          {visibleProducts.slice(rowIndex * itemsPerRow, (rowIndex + 1) * itemsPerRow).map((product, index) => (
            <ProductCard key={index} {...product} />
          ))}
        </div>
      ))}

      {loadedRows * itemsPerRow < products.length && (
        <div className='loadMoreContainer'>
        <button onClick={loadMoreRows} className='loadMoreButton'>Load More</button>
</div>

      )}
    </section>
  );
};

export default ProductGrid;