import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { formatDateIST } from '../utils/dateFormatter';

const BlogHomepage = ({ isDark }) => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({
    user_name: '',
    user_email: '',
    blog_subject: '',
    blog_description: ''
  });
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://biomuseum.onrender.com';
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/blogs`);
      setBlogs(response.data || []);
      setFilteredBlogs(response.data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    const filtered = blogs.filter(blog =>
      blog.title.toLowerCase().includes(query) ||
      blog.subject.toLowerCase().includes(query) ||
      blog.content.toLowerCase().includes(query)
    );
    setFilteredBlogs(filtered);
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    if (!suggestionForm.user_name || !suggestionForm.user_email || !suggestionForm.blog_subject) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setSuggestionSubmitting(true);
      await axios.post(`${API}/blogs/suggestions`, suggestionForm);
      alert('Thank you for your suggestion! We appreciate your input.');
      setSuggestionForm({
        user_name: '',
        user_email: '',
        blog_subject: '',
        blog_description: ''
      });
      setShowSuggestionModal(false);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      alert('Error submitting suggestion. Please try again.');
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <Helmet>
        <title>Biology Blog - Articles & Insights | BioMuseum</title>
        <meta name="description" content="Read insightful biology blog posts, articles, and educational content about organisms, ecosystems, and life science." />
        <meta name="keywords" content="biology blog, science articles, educational content, organism insights, biology education" />
        <meta property="og:title" content="Biology Blog | BioMuseum" />
        <meta property="og:description" content="Explore our collection of biology articles and educational blog posts." />
        <meta property="og:url" content="https://biomuseumsbes.vercel.app/blogs" />
        <link rel="canonical" href="https://biomuseumsbes.vercel.app/blogs" />
      </Helmet>

      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'} border-b shadow-lg`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => navigate('/')}
                  className={`px-2.5 sm:px-3 py-2 rounded-lg font-semibold transition-all min-h-[2.5rem] min-w-[2.5rem] flex items-center justify-center flex-shrink-0 ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  ←
                </button>
                <h1 className={`text-lg sm:text-2xl md:text-4xl font-bold truncate ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  <i className="fas fa-book mr-1"></i>Blogs
                </h1>
              </div>
              <button
                onClick={() => setShowSuggestionModal(true)}
                className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm sm:text-base bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg transition-all active:scale-95 min-h-[2.5rem] whitespace-nowrap flex-shrink-0"
              >
                <i className="fas fa-lightbulb mr-1"></i>Suggest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={handleSearch}
            className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border-2 text-sm sm:text-base transition-all focus:outline-none ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
            }`}
          />
          <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-lg sm:text-2xl pointer-events-none"><i className="fas fa-search"></i></span>
        </div>
      </div>

      {/* Blogs Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pb-8 sm:pb-12">
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-block animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-blue-500"></div>
            <p className={`mt-3 sm:mt-4 text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading blogs...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className={`text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchQuery ? 'No blogs found matching your search.' : 'No blogs available yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                onClick={() => navigate(`/blog/${blog.id}`)}
                className={`group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl backdrop-blur-md active:scale-95 ${
                  isDark
                    ? 'bg-gray-800/40 border-2 border-gradient-to-r from-blue-500/60 to-purple-500/60 hover:bg-gray-700/60'
                    : 'bg-white/40 border-2 border-gradient-to-r from-blue-400/70 to-purple-400/70 hover:bg-white/80'
                }`}
              >
                {/* Image */}
                {blog.image_url && (
                  <div className="relative h-28 sm:h-36 md:h-44 overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
                    <img
                      src={blog.image_url}
                      alt={blog.subject}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x250?text=Blog+Image';
                      }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-2.5 sm:p-3 md:p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2 flex-1">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-sm sm:text-base line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {blog.title}
                      </h3>
                      <p className={`text-xs mt-0.5 line-clamp-1 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                        {blog.subject}
                      </p>
                    </div>
                  </div>

                  <p className={`line-clamp-1 mb-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {blog.content.substring(0, 60)}...
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs gap-1.5 mt-auto">
                    <div className="flex gap-1.5 sm:gap-2">
                      <span className={`flex items-center gap-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <i className="fas fa-eye mr-1"></i>{blog.views || 0}
                      </span>
                      <span className={`flex items-center gap-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <i className="fas fa-heart mr-1"></i>{blog.likes || 0}
                      </span>
                    </div>
                    <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} text-xs whitespace-nowrap`}>
                      {formatDateIST(blog.created_at, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4">
          <div className={`rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-8 max-h-[90vh] sm:max-h-none overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-xl sm:text-2xl font-bold mb-2 sm:mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <i className="fas fa-lightbulb mr-2"></i>Suggest a Topic
            </h2>
            <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Have a biology topic you'd like us to write about?
            </p>

            <form onSubmit={handleSuggestionSubmit} className="space-y-3 sm:space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={suggestionForm.user_name}
                onChange={(e) => setSuggestionForm({ ...suggestionForm, user_name: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm sm:text-base focus:outline-none transition-all min-h-[2.5rem] ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
                required
              />
              <input
                type="email"
                placeholder="Your Email"
                value={suggestionForm.user_email}
                onChange={(e) => setSuggestionForm({ ...suggestionForm, user_email: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm sm:text-base focus:outline-none transition-all min-h-[2.5rem] ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
                required
              />
              <input
                type="text"
                placeholder="Blog Subject/Topic"
                value={suggestionForm.blog_subject}
                onChange={(e) => setSuggestionForm({ ...suggestionForm, blog_subject: e.target.value })}
                className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm sm:text-base focus:outline-none transition-all min-h-[2.5rem] ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
                required
              />
              <textarea
                placeholder="Brief description (optional)"
                value={suggestionForm.blog_description}
                onChange={(e) => setSuggestionForm({ ...suggestionForm, blog_description: e.target.value })}
                rows="3"
                className={`w-full px-4 py-2.5 rounded-lg border-2 text-sm sm:text-base focus:outline-none transition-all min-h-[5rem] ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400'
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }`}
              />

              <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setShowSuggestionModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all min-h-[2.5rem] active:scale-95 ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suggestionSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm sm:text-base bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg transition-all disabled:opacity-50 active:scale-95 min-h-[2.5rem]"
                >
                  {suggestionSubmitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogHomepage;
