import { fetchProductsFromImage } from "./fetchProducts";

export const handleUpload = (imageFile, setProductName, setError, setLoading) => {
  return fetchProductsFromImage(imageFile, setProductName, setError, setLoading);
};