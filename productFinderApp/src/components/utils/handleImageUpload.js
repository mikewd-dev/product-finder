import { handleUploadAndAnalyze } from "./handleUploadAndAnalyze";

export const handleImageUpload = async (event, setResults) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const visionData = await handleUploadAndAnalyze(file);
    if (visionData) {
      setResults(visionData);
    }
  } catch (error) {
    console.error("handleImageUpload error:", error);
  }
};