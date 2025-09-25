import { fetchProductsFromImage } from "./fetchProducts";

export const handleImage = (imageFile, setProductName, setError, setLoading) => {
  return fetchProductsFromImage(imageFile, setProductName, setError, setLoading);
};