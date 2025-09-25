import { fetchProductsFromImage } from "./fetchProducts";

export const handleImageUpload = (imageFile, setProductName, setError, setLoading) => {
  return fetchProductsFromImage(imageFile, setProductName, setError, setLoading);
};