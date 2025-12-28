import React, { useState } from 'react';
import DragNDrop from './DragNDrop';

function ImageUpload({ onImageUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      console.log('Base64 Encoded Image:', event.target.result);
    };
    reader.readAsDataURL(file);

    onImageUpload(file);
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <DragNDrop image={selectedFile} onDrop={onImageUpload} />
    </div>
  );
}

export default ImageUpload;
