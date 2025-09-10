import axios from "axios";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64Image = reader.result.split(",")[1];
      resolve(base64Image);
    };

    reader.onerror = (error) => reject(error);
  });
}

export async function handleUploadAndAnalyze(file) {
  try {
    
    const base64Image = await fileToBase64(file);

    const googleResponse = await axios.post(
      "https://vision.googleapis.com/v1/images:annotate?key=YOUR_GOOGLE_API_KEY",
      {
        requests: [
          {
            image: { content: base64Image },
            features: [
              { type: "LABEL_DETECTION", maxResults: 5 },
              { type: "TEXT_DETECTION", maxResults: 5 },
            ],
          },
        ],
      }
    );

    const labels = googleResponse.data.responses[0].labelAnnotations || [];
    const texts = googleResponse.data.responses[0].textAnnotations || [];

    const labelText = labels.map((l) => l.description).join(" ");
    const textText = texts.map((t) => t.description).join(" ");

    const combinedData = `${labelText} ${textText}`;

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