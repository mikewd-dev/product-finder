import axios from "axios";

async function handleUploadAndAnalyze(file) {
  try {
    // 1️⃣ Convert file to base64 if needed
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result.split(",")[1];

      // 2️⃣ Send image to Google Vision API
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

      const labelText = labels.map(l => l.description).join(" ");
      const textText = texts.map(t => t.description).join(" ");

      // Combine all meaningful data for RapidAPI
      const combinedData = `${labelText} ${textText}`;

      // 3️⃣ Send combined data to RapidAPI
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

      console.log("RapidAPI response:", rapidApiResponse.data);

      // 4️⃣ Handle/display results in your UI as needed
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
  }
}