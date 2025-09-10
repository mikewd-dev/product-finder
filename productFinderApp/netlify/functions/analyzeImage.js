import axios from "axios";
import formidable from "formidable";

export const handler = async (event, context) => {
  try {
    const form = new formidable.IncomingForm();

    const file = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        resolve(files.file);
      });
    });

    // Convert file to base64
    const fs = require("fs");
    const base64Image = fs.readFileSync(file.path, { encoding: "base64" });

    // Call Google Vision
    const googleResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_API_KEY}`,
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

    return {
      statusCode: 200,
      body: JSON.stringify(googleResponse.data.responses[0]),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};