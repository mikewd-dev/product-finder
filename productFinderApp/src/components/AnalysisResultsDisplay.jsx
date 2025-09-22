function AnalysisResults({ analysisResults }) {
  if (!analysisResults) return null;

  // Attempt to get images from either expected Vision API fields or fallback to product data
  const pagesWithMatchingImages = analysisResults.pagesWithMatchingImages || [];
  const visuallySimilarImages =
    analysisResults.visuallySimilarImages ||
    analysisResults.data?.map(product => ({
      url: product.images?.[0] || "", // take first image if available
    })) || [];

  return (
    <div>
      {pagesWithMatchingImages.length > 0 && (
        <div className="matching-images">
          <h2>Web Pages with Matching Images:</h2>
          <ul className="matching-list">
            {pagesWithMatchingImages.map((page, index) => (
              <li key={index}>
                <a href={page.url} target="_blank" rel="noopener noreferrer">
                  {page.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {visuallySimilarImages.length > 0 && (
        <div className="visually-similar">
          <h2>Visually Similar Images:</h2>
          <ul>
            {visuallySimilarImages.map((image, index) => (
              <li key={index}>
                {image.url && <img src={image.url} alt={`Matching Image ${index + 1}`} />}
                {image.url && (
                  <p>
                    <a href={image.url} target="_blank" rel="noopener noreferrer">
                      View Image
                    </a>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pagesWithMatchingImages.length === 0 && visuallySimilarImages.length === 0 && (
        <p>No analysis results to display.</p>
      )}
    </div>
  );
}

export default AnalysisResults;