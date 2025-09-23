import { google } from 'googleapis';

export async function handler(event, context) {
  try {
    // Parse the JSON key from env variable
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
    });

    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });

    // Test: list first 5 files
    const res = await drive.files.list({ pageSize: 5 });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Service account works!', files: res.data.files }),
    };
  } catch (err) {
    console.error('Service account test failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}