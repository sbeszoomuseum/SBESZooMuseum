import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';

const BiotubeHomepage = ({ isDark }) => {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [filters, setFilters] = useState({
    kingdom: '',
    phylum: '',
    class_name: '',
    species: ''
  });
  const [availableFilters, setAvailableFilters] = useState({
    kingdoms: [],
    phylums: [],
    classes: [],
    species: []
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (
    window.location.hostname.includes('vercel.app')
      ? 'https://biomuseum.onrender.com'
      : 'http://localhost:8000'
  );
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    fetchVideos();
    fetchFilters();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/biotube/videos`);
      setVideos(response.data);
      setFilteredVideos(response.data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await axios.get(`${API}/biotube/filters`);
      setAvailableFilters(response.data);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterVideos(query, filters);
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    filterVideos(searchQuery, newFilters);
  };

  const filterVideos = (search, filterObj) => {
    let result = videos;

    // Apply filters
    if (filterObj.kingdom) {
      result = result.filter(v => v.kingdom.toLowerCase() === filterObj.kingdom.toLowerCase());
    }
    if (filterObj.phylum) {
      result = result.filter(v => v.phylum.toLowerCase() === filterObj.phylum.toLowerCase());
    }
    if (filterObj.class_name) {
      result = result.filter(v => v.class_name.toLowerCase() === filterObj.class_name.toLowerCase());
    }
    if (filterObj.species) {
      result = result.filter(v => v.species.toLowerCase() === filterObj.species.toLowerCase());
    }

    // Apply search
    if (search) {
      result = result.filter(v =>
        v.title.toLowerCase().includes(search) ||
        v.description.toLowerCase().includes(search) ||
        v.species.toLowerCase().includes(search)
      );
    }

    setFilteredVideos(result);
  };

  const clearFilters = () => {
    setFilters({
      kingdom: '',
      phylum: '',
      class_name: '',
      species: ''
    });
    setSearchQuery('');
    setFilteredVideos(videos);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Helmet>
        <title>BioTube - Educational Biology Videos | BioMuseum</title>
        <meta name="description" content="Watch educational biology videos and tutorials on BioTube. Learn about species, ecosystems, and life science with expert-curated content." />
        <meta name="keywords" content="biology videos, educational videos, biology tutorials, science learning, species, ecosystems" />
        <meta property="og:title" content="BioTube - Educational Biology Videos | BioMuseum" />
        <meta property="og:description" content="Watch educational biology videos and tutorials on BioTube." />
        <meta property="og:url" content="https://biomuseumsbes.vercel.app/biotube" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://biomuseumsbes.vercel.app/biotube" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoCollection",
            "name": "BioTube - Educational Videos",
            "description": "Collection of educational biology videos and tutorials",
            "url": "https://biomuseumsbes.vercel.app/biotube"
          })}
        </script>
      </Helmet>
      {/* Header with Video Suggestion Button */}
      <div className={`sticky top-0 z-40 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <a
              href="/"
              className={`px-2 sm:px-3 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              ← Back
            </a>
            <div className="min-w-0 flex-1">
              <h1 className={`text-xl sm:text-3xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <i className="fas fa-video mr-2"></i>BioTube
              </h1>
              <p className={`text-xs sm:text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Explore Biology Videos
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSuggestModal(true)}
            className="px-2 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all text-xs sm:text-base whitespace-nowrap"
          >
            <i className="fa-solid fa-lightbulb mr-2"></i><span className="hidden sm:inline">Suggest</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} py-4 sm:py-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* Search Bar */}
          <div className="mb-3 sm:mb-4">
            <div className={`relative flex items-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-full px-3 sm:px-4 py-2`}>
              <span className="text-lg sm:text-2xl mr-2 sm:mr-3"><i className="fa-solid fa-search"></i></span>
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={handleSearch}
                className={`flex-1 text-sm sm:text-base outline-none bg-transparent ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex gap-2 sm:gap-3 flex-wrap items-center text-xs sm:text-base">
            <button
              onClick={() => setShowFilterModal(!showFilterModal)}
              className={`px-2 sm:px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
                isDark
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              <i className="fa-solid fa-sliders-h mr-2"></i><span className="hidden sm:inline">Filters</span>
            </button>

            {Object.values(filters).some(f => f !== '') && (
              <button
                onClick={clearFilters}
                className={`px-2 sm:px-4 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                }`}
              >
                <i className="fa-solid fa-times mr-2"></i><span className="hidden sm:inline">Clear</span>
              </button>
            )}

            {/* Active Filter Tags */}
            <div className="flex gap-2 flex-wrap">
              {filters.kingdom && (
                <span className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                  Kingdom: {filters.kingdom}
                </span>
              )}
              {filters.phylum && (
                <span className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                  Phylum: {filters.phylum}
                </span>
              )}
              {filters.class_name && (
                <span className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
                  Class: {filters.class_name}
                </span>
              )}
              {filters.species && (
                <span className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800'}`}>
                  Species: {filters.species}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} py-4 sm:py-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {/* Kingdom Filter */}
              <div>
                <label className={`block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kingdom
                </label>
                <select
                  value={filters.kingdom}
                  onChange={(e) => handleFilterChange('kingdom', e.target.value)}
                  className={`w-full px-2 sm:px-3 py-1 sm:py-2 rounded border text-xs sm:text-base ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">All Kingdoms</option>
                  {availableFilters.kingdoms.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Phylum Filter */}
              <div>
                <label className={`block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phylum
                </label>
                <select
                  value={filters.phylum}
                  onChange={(e) => handleFilterChange('phylum', e.target.value)}
                  className={`w-full px-2 sm:px-3 py-1 sm:py-2 rounded border text-xs sm:text-base ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">All Phylums</option>
                  {availableFilters.phylums.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className={`block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Class
                </label>
                <select
                  value={filters.class_name}
                  onChange={(e) => handleFilterChange('class_name', e.target.value)}
                  className={`w-full px-2 sm:px-3 py-1 sm:py-2 rounded border text-xs sm:text-base ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">All Classes</option>
                  {availableFilters.classes.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Species Filter */}
              <div>
                <label className={`block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Species
                </label>
                <select
                  value={filters.species}
                  onChange={(e) => handleFilterChange('species', e.target.value)}
                  className={`w-full px-2 sm:px-3 py-1 sm:py-2 rounded border text-xs sm:text-base ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">All Species</option>
                  {availableFilters.species.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className={`text-2xl mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><i className="fa-solid fa-video"></i></div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className={`text-4xl mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}><i className="fa-solid fa-tv"></i></div>
            <p className={`text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              No videos found
            </p>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filteredVideos.map((video) => (
              <a
                key={video.id}
                href={`/biotube/watch/${video.id}`}
                className={`group btn-biotube rounded-lg overflow-hidden transition-all hover:shadow-lg ${
                  isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative bg-black aspect-video overflow-hidden">
                  <img
                    src={video.thumbnail_url || 'https://via.placeholder.com/320x180?text=No+Thumbnail'}
                    alt={video.title}
                    className="organism-image w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/320x180?text=Video';
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                    <div className="text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity">
                      ▶
                    </div>
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-2 sm:p-4">
                  <h3 className={`font-semibold line-clamp-2 mb-2 text-sm sm:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {video.title}
                  </h3>
                  
                  {/* Tags */}
                  <div className="flex gap-1 sm:gap-2 flex-wrap mb-2 sm:mb-3 text-xs">
                    <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                      {video.kingdom}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                      {video.species}
                    </span>
                  </div>

                  {/* Description Preview */}
                  <p className={`text-xs sm:text-sm line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {video.description || 'No description available'}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Suggest Video Modal */}
      {showSuggestModal && (
        <SuggestVideoModal
          isDark={isDark}
          onClose={() => setShowSuggestModal(false)}
          onSuccess={() => {
            setShowSuggestModal(false);
            fetchVideos();
          }}
          apiUrl={API}
        />
      )}
    </div>
  );
};

// Suggest Video Modal Component
const SuggestVideoModal = ({ isDark, onClose, onSuccess, apiUrl }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    user_class: '',
    video_title: '',
    video_description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const educationalLevels = [
    '11th', '12th', 'B.Sc 1st Year', 'B.Sc 2nd Year', 'B.Sc 3rd Year', 'B.Sc 4th Year',
    'BCS', 'BCA', 'B.Voc', 'M.Sc', 'PhD', 'Teacher', 'Professional', 'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.user_name.trim() || !formData.user_class || !formData.video_title.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${apiUrl}/biotube/suggest-video`, formData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error submitting suggestion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-xl p-6 w-full max-w-md shadow-2xl`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <i className="fa-solid fa-lightbulb mr-2"></i>Suggest a Video
          </h2>
          <button
            onClick={onClose}
            className={`text-2xl ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
          >
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {success ? (
          <div className={`p-4 rounded-lg text-center ${isDark ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-900'}`}>
            <p className="font-semibold mb-2"><i className="fa-solid fa-circle-check mr-2"></i>Thank you!</p>
            <p>Your suggestion has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`p-3 rounded ${isDark ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'}`}>
                {error}
              </div>
            )}

            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Name *
              </label>
              <input
                type="text"
                value={formData.user_name}
                onChange={(e) => setFormData({...formData, user_name: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Class / Standard *
              </label>
              <select
                value={formData.user_class}
                onChange={(e) => setFormData({...formData, user_class: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="">Select your class</option>
                {educationalLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Video Title *
              </label>
              <input
                type="text"
                value={formData.video_title}
                onChange={(e) => setFormData({...formData, video_title: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder="e.g., Lion Hunting Behavior"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Description (Optional)
              </label>
              <textarea
                value={formData.video_description}
                onChange={(e) => setFormData({...formData, video_description: e.target.value})}
                className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                placeholder="Brief description or YouTube link"
                rows="3"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-all"
            >
              {loading ? 'Submitting...' : <><i className="fa-solid fa-circle-check mr-2"></i>Submit Suggestion</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BiotubeHomepage;
