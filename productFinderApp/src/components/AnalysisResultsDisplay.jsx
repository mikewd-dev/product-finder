function AnalysisResults({ analysisResults }) {
  console.log("Analysis results:", analysisResults);
  return (
    <div>
      {analysisResults && (
        <>

          {analysisResults.pagesWithMatchingImages && (
            <>
            <div className="matching-images">
              <h2>Web Pages with Matching Images:</h2>
              <ul className="matching-list">
                {analysisResults.pagesWithMatchingImages.map((page, index) => (
                  <li key={index}>
                   <a href={page.url} target="_blank" rel="noopener noreferrer">{page.url}</a>
                  </li>
                ))}
              </ul>
              </div>
            </>
          )}

          <div className="visually-similar">
          <h2>Visually Similar Images:</h2>
          <ul>
            {analysisResults.visuallySimilarImages.map((image, index) => (
              <li key={index}>
                <img src={image.url} alt={`Matching Image ${index + 1}`} />
                <p><a href={image.url} target="_blank" rel="noopener noreferrer">View Image</a></p>
              </li>
             
            ))}
          </ul>
           </div>
        </>
      )}
    </div>
  );
}

export default AnalysisResults;
