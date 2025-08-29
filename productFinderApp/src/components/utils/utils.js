export const formatError = (error) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.response && error.response.data) {
    return JSON.stringify(error.response.data);
  }
  return JSON.stringify(error);
};