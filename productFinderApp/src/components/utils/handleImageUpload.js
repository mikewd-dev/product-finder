import axios from "axios";
import heic2any from "heic2any";
import { imageFileResizer } from "react-image-file-resizer";

const modifyData = (products) => {
  let modifiedData = [];
  products = products;
  products.map((product) => {
    const shippingValue = product.offer.shipping ? product.offer.shipping : 0;
    const imagesValue = Array.isArray(product.product_photos)
      ? product.product_photos
      : [product.product_photos];

    modifiedData.push( {
      name: product.product_title,
      description: product.product_description,
      retailer: product.offer.store_name,
      rating: product.offer.store_rating,
      price: product.offer.price.replace(/£/g, ''),
      shipping: shippingValue,
      link: product.offer.offer_page_url,
      images: imagesValue,
    });

  });
  return modifiedData;
};
// Utility function to handle image upload

// Utility function to extract item name from response
const extractItemNameFromResponse = (response, setProductName) => {
  if (response?.data?.responses?.[0]?.fullTextAnnotation) {
    const extractedText = response.data.responses[0].fullTextAnnotation.text;
    setProductName(extractedText);
    return extractedText;
  }
  return "Unknown Item";
};

// Utility function to fetch data from real-time-data API

  export const handleImageUpload = async (
    imageFile,
    setProductName,
    setError,
    setLoading,
  ) => {
    const fetchData = async ( //This is horrific and I hate it, if I had time I would re write all of these functions to not have states within them
      itemName,
      setLoading,
      setProductData,
      setError
    ) => {
      let retrievedData;
      const options = {
        method: "GET",
        url: "https://real-time-product-search.p.rapidapi.com/search",
        params: {
          q: itemName,
          country: "gb",
          language: "en",
          limit: 29,
          sort_by: "LOWEST_PRICE",
        },
        headers: {
          "X-RapidAPI-Key": import.meta.env.VITE_REACT_APP_RAPIDAPI_KEY,
          "X-RapidAPI-Host": import.meta.env.VITE_REACT_APP_RAPIDAPI_HOST,
        },
      };

      try {
        setLoading(true);
        const response = await axios.request(options);
        retrievedData = response.data;
      } catch (error) {
        setError(error);
        console.error("Error fetching data:", error.response);
      } finally {
        setLoading(false);
        return retrievedData;
      }
    };

    try {
      let convertedImage;

      if (
        imageFile.type.startsWith("image/svg+xml") ||
        imageFile.type.startsWith("image/png") ||
        imageFile.type.startsWith("image/jpeg")
      ) {
        convertedImage = imageFile;
      } else {
        convertedImage = await heic2any({ blob: imageFile });
      }

      const reader = new FileReader();

      // Wrap the entire asynchronous operation in a Promise
      const visionApiResponse = await new Promise((resolve, reject) => {
        reader.onload = async () => {
          const imageContent = reader.result.split(",")[1];

          const visionApiEndpoint =
            "https://vision.googleapis.com/v1/images:annotate";
          const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;

          try {
            const response = await axios.post(
              `${visionApiEndpoint}?key=${apiKey}`,
              {
                requests: [
                  {
                    image: {
                      content: imageContent,
                    },
                    features: [
                      { type: "PRODUCT_SEARCH", maxResults: 10 },
                      { type: "LABEL_DETECTION", maxResults: 5 },
                      { type: "LOGO_DETECTION", maxResults: 5 },
                      { type: "TEXT_DETECTION", maxResults: 5 },
                    ],
                  },
                ],
              },
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            resolve(response);
          } catch (error) {
            reject(error);
          }
        };

        reader.readAsDataURL(convertedImage);
      });



      const itemName = extractItemNameFromResponse(
        visionApiResponse,
        setProductName
      );
      setProductName(itemName);

      // Pass setLoading as an argument to the fetchData function
      const fetchResponse = await fetchData(
        itemName,
        setLoading,
        setProductName,
        setError
      );

      return modifyData(fetchResponse.data);
    } catch (error) {
      setError(error);
      console.error("Error handling image:", error);
    }
  };