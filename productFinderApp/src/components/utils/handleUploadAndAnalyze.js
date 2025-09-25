export const handleUploadAndAnalyze = async (file) => {
  if (!file) return null;

  try {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        const base64 = reader.result.split(",")[1];

        try {
          const response = await fetch("/.netlify/functions/analyzeImage", {
            method: "POST",
            body: JSON.stringify({ imageBase64: base64 }),
          });

          const data = await response.json();
          console.log("Vision API response:", data); // ✅ You had this before

          resolve(data);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error("handleUploadAndAnalyze error:", error);
    return null;
  }
};