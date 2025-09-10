// netlify/functions/ping.js
exports.handler = async (event, context) => {
  console.log("Ping function was hit!");
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "pong" }),
  };
};