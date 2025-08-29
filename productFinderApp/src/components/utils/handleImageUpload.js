export const handleImageUpload = async (
  imageFile,
  setProductName,
  setError,
  setLoading
) => {
  const fetchData = async (
    itemName,
    setLoading,
    setProductData,
    setError
  ) => {
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
      console.log("Calling RapidAPI with item:", itemName);
      setLoading(true);
      const response = await axios.request(options);
      console.log("RapidAPI success");
      return response.data;
    } catch (error) {
      console.error("RapidAPI error:", {
        status: error?.response?.status,
        data: error?.response?.data,
        headers: error?.response?.headers,
      });
      setError("RapidAPI failed: " + (error?.response?.status || "Unknown"));
      return null;
    } finally {
      setLoading(false);
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

    // Wrap in promise to await Vision API response
    const visionApiResponse = await new Promise((resolve, reject) => {
      reader.onload = async () => {
        const imageContent = reader.result.split(",")[1];
        const visionApiEndpoint =
          "https://vision.googleapis.com/v1/images:annotate";
        const apiKey = import.meta.env.VITE_REACT_APP_GOOGLE_VISION_API;

        try {
          console.log("📡 Calling Google Vision API...");
          const response = await axios.post(
            `${visionApiEndpoint}?key=${apiKey}`,
            {
              requests: [
                {
                  image: { content: imageContent },
                  features: [
                    { type: "PRODUCT_SEARCH", maxResults: 10 },
                    { type: "LABEL_DETECTION", maxResults: 5 },
                    { type: "LOGO_DETECTION", maxResults: 5 },
                    { type: "TEXT_DETECTION", maxResults: 5 },
                  ],
                },
              ],
            },
            { headers: { "Content-Type": "application/json" } }
          );
          console.log("Vision API success");
          resolve(response);
        } catch (error) {
          console.error("Vision API error:", {
            status: error?.response?.status,
            data: error?.response?.data,
          });
         setError("Google Vision API failed: " + (error?.response?.status || "Unknown")); 
          reject(error);
        }
      };

      reader.readAsDataURL(convertedImage);
    });

    // Extract name from Vision API response
    const itemName = extractItemNameFromResponse(
      visionApiResponse,
      setProductName
    );
    setProductName(itemName);

    // Call RapidAPI
    const fetchResponse = await fetchData(
      itemName,
      setLoading,
      setProductName,
      setError
    );

    if (!fetchResponse) return null;

    return modifyData(fetchResponse.data);
  } catch (error) {
    console.error("General error in handleImageUpload:", error);
    setError("Image handling failed: " + error.message);
  }
};