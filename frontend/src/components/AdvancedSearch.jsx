import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = (() => {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  if (window.location.hostname.includes('vercel.app')) return 'https://sbzoomuseum.onrender.com';
  return 'http://localhost:8000';
})();
const API = `${BACKEND_URL}/api`;

const AdvancedSearch = ({ isDark }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    kingdom: '',
    phylum: '',
    class: '',
    species: '',
    endangered: null,
    has_images: true,
    habitat: ''
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/advanced-search`, {
        search_term: searchTerm,
        filters: filters
      });
      setResults(response.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = async (value) => {
    setSearchTerm(value);
    if (value.length > 2) {
      try {
        const response = await axios.get(`${API}/search-suggestions?term=${value}`);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      kingdom: '',
      phylum: '',
      class: '',
      species: '',
      endangered: null,
      has_images: true,
      habitat: ''
    });
    setResults([]);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            <i className="fa-solid fa-search mr-2 text-blue-500"></i>Advanced Search
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Search organisms by multiple criteria
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:col-span-1 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg h-fit`}>
            <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Filters
            </h2>

            {/* Search Input */}
            <div className="mb-4">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Organism name..."
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                {suggestions.length > 0 && (
                  <div className={`absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-10 ${
                    isDark ? 'bg-gray-700' : 'bg-white'
                  }`}>
                    {suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSearchTerm(suggestion);
                          setSuggestions([]);
                        }}
                        className={`px-4 py-2 cursor-pointer ${
                          isDark ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Taxonomy Filters */}
            {['kingdom', 'phylum', 'class', 'species'].map(field => (
              <div key={field} className="mb-4">
                <label className={`block text-sm font-semibold mb-2 capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {field}
                </label>
                <input
                  type="text"
                  value={filters[field]}
                  onChange={(e) => updateFilter(field, e.target.value)}
                  placeholder={`Filter by ${field}...`}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
            ))}

            {/* Endangered Filter */}
            <div className="mb-4">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </label>
              <select
                value={filters.endangered === null ? '' : filters.endangered}
                onChange={(e) => updateFilter('endangered', e.target.value === '' ? null : e.target.value === 'true')}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="">Any</option>
                <option value="true">Endangered</option>
                <option value="false">Not Endangered</option>
              </select>
            </div>

            {/* Habitat Filter */}
            <div className="mb-4">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Habitat
              </label>
              <input
                type="text"
                value={filters.habitat}
                onChange={(e) => updateFilter('habitat', e.target.value)}
                placeholder="e.g., Forest, Ocean..."
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg transition"
              >
                <i className="fa-solid fa-search mr-1"></i>Search
              </button>
              <button
                onClick={clearFilters}
                className={`flex-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} font-semibold py-2 rounded-lg transition`}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Searching...
              </div>
            ) : (
              <>
                <div className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Found {results.length} result{results.length !== 1 ? 's' : ''}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((organism, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg overflow-hidden shadow-lg transition hover:shadow-xl ${
                        isDark ? 'bg-gray-800' : 'bg-white'
                      }`}
                    >
                      {organism.images && organism.images[0] && (
                        <img
                          src={organism.images[0]}
                          alt={organism.organism_name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {organism.organism_name}
                        </h3>
                        <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {organism.scientific_name}
                        </p>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <div>{organism.kingdom} • {organism.phylum}</div>
                          <div>{organism.class} • {organism.species}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {results.length === 0 && !loading && (
                  <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No results found. Try different filters.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;
