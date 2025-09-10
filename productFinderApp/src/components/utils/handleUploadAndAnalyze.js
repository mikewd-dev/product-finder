import axios from "axios";

export async function handleUploadAndAnalyze(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Call your Netlify function
    const response = await axios.post("/.netlify/functions/analyzeImage", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // The Netlify function returns Google Vision result
    const googleData = response.data;

    // Combine labels and text
    const labels = googleData.labelAnnotations || [];
    const texts = googleData.textAnnotations || [];

    const labelText = labels.map(l => l.description).join(" ");
    const textText = texts.map(t => t.description).join(" ");

    const combinedData = `${labelText} ${textText}`;

    // Call RapidAPI with combined data
    const rapidApiResponse = await axios.post(
      "https://your-rapidapi-endpoint.com/search",
      { query: combinedData },
      {
        headers: {
          "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
          "Content-Type": "application/json",
        },
      }
    );

    return rapidApiResponse.data;

  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
}