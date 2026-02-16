import React, { useState } from 'react';
import { generateOrganismData, fetchOrganismImages } from '../services/aiService';

const AIAssistant = ({ onDataSelected, onClose }) => {
  const [animalName, setAnimalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState('');

  const handleGenerateData = async () => {
    if (!animalName.trim()) {
      setError('Please enter an animal name');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await generateOrganismData(animalName);
      
      if (result.success) {
        setGeneratedData(result.data);
        
        // Try to fetch images
        const imgResult = await fetchOrganismImages(animalName);
        if (imgResult.success) {
          setImages(imgResult.images);
        }
      } else {
        setError(result.error || 'Failed to generate data');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseData = () => {
    if (onDataSelected && generatedData) {
      onDataSelected({
        ...generatedData,
        image_url: selectedImage?.url || ''
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl"></span> Intelligence
            </h2>
            <p className="text-blue-100 text-sm mt-1">Auto-fill organism data by Intelligence</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl hover:scale-110 transition-transform"
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="p-6">
          {/* Input Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animal or Organism Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={animalName}
                onChange={(e) => setAnimalName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGenerateData()}
                placeholder="e.g., Lion, Tiger, Dolphin..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={handleGenerateData}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-cog animate-spin"></i> Generating...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>Generate
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <i className="fa-solid fa-exclamation-triangle"></i> {error}
              </p>
            )}
          </div>

          {/* Results Section */}
          {generatedData && (
            <div className="space-y-6 animate-fadeIn">
              {/* Organism Data Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-list"></i> Organism Data
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Common Name</p>
                    <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                      {generatedData.name}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600 font-medium">Scientific Name</p>
                    <p className="text-gray-900 bg-white p-2 rounded border border-gray-200 italic">
                      {generatedData.scientific_name}
                    </p>
                  </div>

                  {generatedData.kingdom && (
                    <div>
                      <p className="text-gray-600 font-medium">Kingdom</p>
                      <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                        {generatedData.kingdom}
                      </p>
                    </div>
                  )}

                  {generatedData.phylum && (
                    <div>
                      <p className="text-gray-600 font-medium">Phylum</p>
                      <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                        {generatedData.phylum}
                      </p>
                    </div>
                  )}

                  {generatedData.class && (
                    <div>
                      <p className="text-gray-600 font-medium">Class</p>
                      <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                        {generatedData.class}
                      </p>
                    </div>
                  )}

                  {generatedData.order && (
                    <div>
                      <p className="text-gray-600 font-medium">Order</p>
                      <p className="text-gray-900 bg-white p-2 rounded border border-gray-200">
                        {generatedData.order}
                      </p>
                    </div>
                  )}
                </div>

                {/* Descriptions */}
                <div className="mt-4 space-y-3">
                  {generatedData.morphology && (
                    <div>
                      <p className="text-gray-600 font-medium text-sm">Morphology</p>
                      <p className="text-gray-900 text-sm bg-white p-2 rounded border border-gray-200">
                        {generatedData.morphology.substring(0, 150)}...
                      </p>
                    </div>
                  )}

                  {generatedData.description && (
                    <div>
                      <p className="text-gray-600 font-medium text-sm">Description</p>
                      <p className="text-gray-900 text-sm bg-white p-2 rounded border border-gray-200">
                        {generatedData.description.substring(0, 150)}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Images Section */}
              {images.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-image"></i> Select Image
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(img)}
                        className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage?.url === img.url
                            ? 'border-blue-500 scale-105 shadow-lg'
                            : 'border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.alt}
                          className="w-full h-24 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {selectedImage && (
                    <p className="text-xs text-gray-500 mt-2">
                      <i className="fa-solid fa-check text-green-600 mr-1"></i>Selected: {selectedImage.attribution}
                    </p>
                  )}
                </div>
              )}

              {/* Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <i className="fa-solid fa-circle-info text-blue-600 mr-2"></i><span className="font-medium">Note:</span> Intelligence can make Mistakes like Humans. Please Review all Generated Data Carefully before Using it in your Collection.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleUseData}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-circle-check"></i> Use This Data
                </button>
                <button
                  onClick={() => {
                    setGeneratedData(null);
                    setImages([]);
                    setSelectedImage(null);
                    setAnimalName('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!generatedData && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4"><i className="fa-solid fa-search"></i></div>
              <p className="text-lg font-medium">Enter an animal name to get started!</p>
              <p className="text-sm mt-2">Try: Any Animal or Organims in Your Mind</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-bounce">🧬</div>
              <p className="text-lg font-medium text-gray-700">Generating organism data...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AIAssistant;
