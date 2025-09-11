export async function handleUploadAndAnalyze(file) {
  try {
    // Convert image to Base64
    const reader = new FileReader();
    const base64Image = await new Promise((resolve, reject) => {
      reader.onload = () => {
        if (!reader.result) return reject("Failed to read image");
        resolve(reader.result.split(",")[1]); // strip "data:image/...;base64,"
      };
      reader.onerror = () => reject("Failed to read image file");
      reader.readAsDataURL(file);
    });

    const response = await fetch("/.netlify/functions/analyzeImage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64Image }),
    });

    if (!response.ok) throw new Error(`AnalyzeImage failed: ${response.status}`);
    const googleData = await response.json();

    const labels = googleData.responses?.[0]?.labelAnnotations || [];
    const texts = googleData.responses?.[0]?.textAnnotations || [];

    const labelText = labels.map(l => l.description).join(" ");
    const textText = texts.map(t => t.description).join(" ");

    const combinedData = `${labelText} ${textText}`.trim();

  
    const rapidResponse = await fetch(
      `/.netlify/functions/fetchProducts?q=${encodeURIComponent(combinedData)}`
    );

    if (!rapidResponse.ok) throw new Error(`fetchProducts failed: ${rapidResponse.status}`);
    const rapidData = await rapidResponse.json();

    return rapidData;

  } catch (error) {
    console.error("Error in handleUploadAndAnalyze:", error);
    throw error;
  }
}