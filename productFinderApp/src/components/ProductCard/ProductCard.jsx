import '../../styles/ProductCard.css'
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import {IoIosArrowForward, IoIosArrowBack, IoIosStar,  IoIosStarHalf, IoIosStarOutline } from "react-icons/io";
import React, { useState, useEffect } from 'react';
import 'react-responsive-modal/styles.css';
import ImageCarousel from './imageCarousel';
import { HiOutlineShoppingBag } from "react-icons/hi";




function extractShippingPrice(shippingInfo) {
  
  if (typeof shippingInfo === 'string') {

    const match = shippingInfo.match(/£(\d+(\.\d{1,2})?)/);

    if (match) {
      return `+ ${match[0]} shipping`;
    }
  }

  return 0; 
}



const convertRatingToStars = (rating) => {
   const intRating = Math.trunc(rating); //Gets whole number of rating without decimal, DOES NOT ROUND e.g 4.7 => 4
   const remainder = rating - intRating;
   const stars = [];
   
  
   for (let i = 0; i < intRating; i++) {
     stars.push(<IoIosStar key={i} />);
   }
  
   if (remainder > 0.201) {
     stars.push(<IoIosStarHalf key="half" />);
   }
  
   while (stars.length < 5) {
     stars.push(<IoIosStarOutline key={stars.length} />);
   }
   return stars;
 };

 const openRetailerSite = (link) => {
  window.open(link, '_blank');
};

function truncateDescription(desc) {

  if(desc){ //In case desc is null
    return desc.length > 200 ? desc.substring(0, 200) : desc;
  }
}



function ProductCard({ images, name, price, isBest, description, link, rating, retailer, shipping }) {
  
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const stars = convertRatingToStars(rating);
  const cardClassName = `product-card ${isBest ? 'best-value' : ''}`;
  const shippingPrice = extractShippingPrice(shipping)
 
  const truncatedDescription = isDescriptionExpanded ? description : truncateDescription(description);


 
  return (
    <div className={cardClassName}>
       {Array.isArray(images) && images.length > 0 ? (
        <ImageCarousel images={images} />
      ) : (
        <div className="product-image-container">
          <img
            className="product-image"
            src="../../assets/images/errorImgCouldNotBeFound.png"
            alt={name}
          ></img>
        </div>
      )}
      <div className="product-details">
        <h3 className="product-name">{name}</h3>
        <div className="product-price-details">
        <h3 className="product-price">
          £{price}
        </h3>

          {shippingPrice === 0 ? (
            <span className="product-shipping">Free Shipping</span>
          ) : (
            <span className="product-shipping">{shippingPrice}</span>
          )}
        </div>
        <div className="product-rating">
          {rating !== null ? (
            stars.map((star, index) => <span key={index}>{star}</span>)
          ) : (
            <span>No Rating Found</span>
          )}
        </div>{' '}
        <div className="product-retailer">from {retailer}</div>
        <p className="product-description">
          {truncatedDescription ? (
            <>
              {truncatedDescription}
              {/*Techincally the "&& description &&" doesnt need to be included here and is an artifact before the item desc could not be found was implemented but i feel safer with it here  */}
              {!isDescriptionExpanded && description && description.length > 200 && ( 
                <span
                  className="see-more"
                  onClick={() => setIsDescriptionExpanded(true)}
                >
                 ... See More
                </span>
              )}
            </>
          ) : (
            "Item description could not be found"
          )}
        </p>{' '}
        <div className='link-container'>
        <button className="product-link" onClick={() => openRetailerSite(link)}>
        <HiOutlineShoppingBag />
        </button>{' '}</div>
    </div>
    </div>
  );
}

export default ProductCard;