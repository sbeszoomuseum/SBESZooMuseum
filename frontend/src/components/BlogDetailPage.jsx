import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { formatDateIST, formatTimeIST } from '../utils/dateFormatter';

const BlogDetailPage = ({ isDark }) => {
  const { blogId } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  const BACKEND_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : (process.env.REACT_APP_BACKEND_URL || 'https://biomuseum.onrender.com');
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    fetchBlog();
  }, [blogId]);

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/blogs/${blogId}`);
      setBlog(response.data);
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      await axios.put(`${API}/blogs/${blogId}/like`);
      setLiked(true);
      setBlog(prev => ({
        ...prev,
        likes: (prev.likes || 0) + 1
      }));
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const downloadQRCode = () => {
    if (!blog?.qr_code) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${blog.qr_code}`;
    link.download = `${blog.title.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center px-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className={`mt-4 text-base sm:text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading blog...</p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center px-4">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Blog Not Found</h1>
          <button
            onClick={() => navigate('/blogs')}
            className="px-6 py-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all font-semibold min-h-[2.5rem] active:scale-95"
          >
            Back to Blogs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'}`}>
      <Helmet>
        <title>{blog.title} | BioMuseum Blog</title>
        <meta name="description" content={blog.subject} />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.subject} />
        <meta property="og:url" content={`https://biomuseumsbes.vercel.app/blog/${blogId}`} />
        <link rel="canonical" href={`https://biomuseumsbes.vercel.app/blog/${blogId}`} />
      </Helmet>

      {/* Header */}
      <div className={`sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'} border-b shadow-lg`}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <button
            onClick={() => navigate('/blogs')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base min-h-[2.5rem] active:scale-95 ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12">
        {/* Hero Image */}
        {blog.image_url && (
          <div className="relative h-48 sm:h-64 md:h-96 rounded-2xl overflow-hidden mb-6 sm:mb-8 bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg">
            <img
              src={blog.image_url}
              alt={blog.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/800x400?text=Blog+Image';
              }}
            />
          </div>
        )}

        {/* Blog Card with Glassmorphism */}
        <div className={`rounded-2xl overflow-hidden backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/40 border border-gray-700/40 shadow-2xl'
            : 'bg-white/40 border border-white/60 shadow-2xl'
        } p-5 sm:p-6 md:p-8 mb-6 sm:mb-8`}>
          
          {/* Title and Meta */}
          <div className="mb-6">
            <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {blog.title}
            </h1>
            <p className={`text-base sm:text-lg md:text-xl ${isDark ? 'text-purple-300' : 'text-purple-600'} mb-3 sm:mb-4`}>
              {blog.subject}
            </p>
            
            {/* Meta Info */}
            <div className={`flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="truncate"><i className="fas fa-calendar mr-1"></i>{formatDateIST(blog.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <span className="truncate"><i className="fas fa-clock mr-1"></i>{formatTimeIST(blog.created_at, { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="truncate"><i className="fas fa-pen-fancy mr-1"></i>{blog.author || 'BioMuseum'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-400/30">
            <button
              onClick={handleLike}
              disabled={liked}
              className={`px-3 sm:px-4 py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all min-h-[2.5rem] active:scale-95 ${
                liked
                  ? 'bg-red-500/30 text-red-300 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <i className="fas fa-heart mr-1"></i>{blog.likes || 0} {liked && <i className="fas fa-check"></i>}
            </button>
            <div className={`px-3 sm:px-4 py-2.5 rounded-lg font-semibold text-sm sm:text-base min-h-[2.5rem] flex items-center gap-1 sm:gap-2 ${isDark ? 'bg-gray-700/40 text-gray-300' : 'bg-gray-200/60 text-gray-700'}`}>
              <i className="fas fa-eye mr-1"></i>{blog.views || 0}
            </div>
            <button
              onClick={downloadQRCode}
              className="px-3 sm:px-4 py-2.5 rounded-lg font-semibold text-sm sm:text-base bg-purple-500 text-white hover:bg-purple-600 transition-all flex items-center gap-1 sm:gap-2 min-h-[2.5rem] active:scale-95"
            >
              <i className="fas fa-mobile-alt mr-1"></i>QR Code
            </button>
          </div>

          {/* QR Code Display */}
          {blog.qr_code && (
            <div className={`mb-6 sm:mb-8 p-4 rounded-xl ${isDark ? 'bg-gray-700/20' : 'bg-white/30'} flex flex-col items-center`}>
              <p className={`mb-3 sm:mb-4 font-semibold text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Scan to Share
              </p>
              <img
                src={`data:image/png;base64,${blog.qr_code}`}
                alt="Blog QR Code"
                className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-lg border-2 border-blue-500"
              />
            </div>
          )}

          {/* Blog Content */}
          <div className={`prose prose-sm sm:prose md:prose-lg ${isDark ? 'prose-invert' : ''} max-w-none`}>
            <div className={`whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed text-sm sm:text-base md:text-lg`}>
              {blog.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center py-6 sm:py-8 rounded-2xl backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/40 border border-gray-700/40'
            : 'bg-white/40 border border-white/60'
        }`}>
          <p className={`text-base sm:text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Enjoying this blog? Share it!
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
            <button
              onClick={() => {
                const url = `https://biomuseumsbes.vercel.app/blog/${blogId}`;
                navigator.clipboard.writeText(url);
                alert('Link copied to clipboard!');
              }}
              className="px-4 sm:px-6 py-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-all font-semibold text-sm sm:text-base min-h-[2.5rem] active:scale-95"
            >
              <i className="fas fa-link mr-1"></i>Copy Link
            </button>
            <button
              onClick={() => navigate('/blogs')}
              className="px-4 sm:px-6 py-2.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-all font-semibold text-sm sm:text-base min-h-[2.5rem] active:scale-95"
            >
              <i className="fas fa-book mr-1"></i>More Blogs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetailPage;
