function AnalysisResults({ analysisResults }) {
  if (!analysisResults) return null;


  const pagesWithMatchingImages = analysisResults.pagesWithMatchingImages || [];
  const visuallySimilarImages =
    analysisResults.visuallySimilarImages ||
    analysisResults.data?.map(product => ({
      url: product.images?.[0] || "", // take first image if available
    })) || [];

  return (
    <div className="visually-similar">
  <h2>Visually Similar Images:</h2>
  {visuallySimilarImages && visuallySimilarImages.length > 0 ? (
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
  ) : (
    <p>No visually similar images to display.</p>
  )}
</div>
  );
}

export default AnalysisResults;