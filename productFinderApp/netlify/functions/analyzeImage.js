// After extracting possible item names
const possibleItemNames = extractItemNames(visionResponse.responses?.[0]);
console.log("possibleItemNames from Vision API:", possibleItemNames);

// Initialize empty products array
let products = [];
let itemNameUsed = "Unknown item";

// Loop through each name and query RapidAPI
for (const name of possibleItemNames) {
  console.log("Querying RapidAPI with:", name);  // <-- log the query

  const rapidApiUrl = new URL(`https://${process.env.VITE_REACT_APP_RAPIDAPI_HOST}/search`);
  rapidApiUrl.search = new URLSearchParams({
    q: name,   // use just 'name' here
    country: "gb",
    language: "en",
    limit: "10",
    sort_by: "LOWEST_PRICE",
  }).toString();

  const rapidResponse = await fetch(rapidApiUrl.toString(), {
    headers: {
      "X-RapidAPI-Key": process.env.VITE_REACT_APP_RAPIDAPI_KEY,
      "X-RapidAPI-Host": process.env.VITE_REACT_APP_RAPIDAPI_HOST,
    },
  });

  if (!rapidResponse.ok) {
    console.log("RapidAPI request failed:", rapidResponse.statusText);
    continue;
  }

  const json = await rapidResponse.json();
  console.log("RapidAPI response for this query:", json); // <-- log full response

  products = json?.data?.products || json?.products || json?.items || [];

  if (products.length > 0) {
    itemNameUsed = name;  // <-- should now set correctly
    break;
  }
}

// Final log before returning
console.log("Final products array:", products);
console.log("Item name used:", itemNameUsed);

return {
  statusCode: 200,
  body: JSON.stringify({ itemName: itemNameUsed, data: products }),
};