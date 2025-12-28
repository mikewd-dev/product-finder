
exports.handler = async function () {
  try {
    const encoded = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!encoded) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Env var not set" }),
      };
    }

    console.log("Encoded length:", encoded.length);

    const decoded = Buffer.from(encoded, "base64").toString("utf-8");

    console.log("Decoded snippet:", decoded.slice(0, 200)); // preview first 200 chars

    const creds = JSON.parse(decoded);

    return {
      statusCode: 200,
      body: JSON.stringify({
        project_id: creds.project_id,
        client_email: creds.client_email,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};