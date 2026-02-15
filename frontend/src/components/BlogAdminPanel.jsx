import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDateIST } from '../utils/dateFormatter';

const BlogAdminPanel = ({ token, isDark }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    subject: '',
    tone: 'educational'
  });
  const [createForm, setCreateForm] = useState({
    title: '',
    subject: '',
    content: '',
    image_url: '',
    author: 'BioMuseum'
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://biomuseum.onrender.com';
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await axios.get(`${API}/admin/blogs/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Dashboard data:', res.data);
        setDashboard(res.data || {});
      } else if (activeTab === 'manage' || activeTab === 'add') {
        const res = await axios.get(`${API}/admin/blogs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Blogs data:', res.data);
        setBlogs(res.data || []);
      } else if (activeTab === 'suggestions') {
        const res = await axios.get(`${API}/admin/blogs/suggestions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Suggestions data:', res.data);
        setSuggestions(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error.response?.data || error.message);
      alert(`Error loading data: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!generateForm.subject.trim()) {
      alert('Please enter a blog subject');
      return;
    }

    try {
      setGeneratingAI(true);
      console.log('Generating blog with subject:', generateForm.subject);
      const res = await axios.post(`${API}/blogs/generate`, generateForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Generated content:', res.data);
      setGeneratedContent(res.data);
      setCreateForm({
        title: res.data.title || `${res.data.subject}: A Comprehensive Guide`,
        subject: res.data.subject,
        content: res.data.content,
        image_url: '',
        author: 'BioMuseum AI'
      });
    } catch (error) {
      console.error('Error generating blog:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.detail || error.message || 'Unknown error';
      alert(`<i className="fas fa-times-circle"></i> Error generating blog:\n${errorMsg}\n\nMake sure:\n1. Gemini API key is configured in backend .env\n2. API key has access to gemini-pro model`);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleCreateBlog = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.subject || !createForm.content) {
      alert('Please fill in Title, Subject, and Content fields');
      return;
    }

    try {
      setSubmitLoading(true);
      await axios.post(`${API}/admin/blogs`, createForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('✓ Blog created successfully!');
      setTimeout(() => {
        setCreateForm({
          title: '',
          subject: '',
          content: '',
          image_url: '',
          author: 'BioMuseum'
        });
        setGeneratedContent(null);
        setShowCreateModal(false);
        setShowGenerateModal(false);
        setGenerateForm({ subject: '', tone: 'educational' });
        fetchData();
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error creating blog:', error);
      alert('Error creating blog. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    try {
      await axios.delete(`${API}/admin/blogs/${blogId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlogs(blogs.filter(b => b.id !== blogId));
      alert('Blog deleted successfully');
    } catch (error) {
      console.error('Error deleting blog:', error);
      alert('Error deleting blog');
    }
  };

  const handleUpdateSuggestionStatus = async (suggestionId, status) => {
    try {
      await axios.put(
        `${API}/admin/blogs/suggestions/${suggestionId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      console.error('Error updating suggestion:', error);
      alert('Error updating suggestion status');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} shadow-lg sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-yellow-400"><i className="fas fa-book mr-2"></i>Blog Admin Panel</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky z-30 top-[70px]`}>
        <div className="max-w-7xl mx-auto px-4 flex gap-2 overflow-x-auto">
          {['dashboard', 'add', 'manage', 'suggestions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab
                  ? `border-blue-500 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                  : `border-transparent ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              {tab === 'dashboard' && <><i className="fas fa-chart-line mr-1"></i>Dashboard</>}
              {tab === 'add' && <><i className="fas fa-plus mr-1"></i>Add</>}
              {tab === 'manage' && <><i className="fas fa-edit mr-1"></i>Manage</>}
              {tab === 'suggestions' && <><i className="fas fa-lightbulb mr-1"></i>Suggestions</>}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && !loading && (
          <div>
            {dashboard ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Total Blogs</h3>
                        <p className="text-4xl font-bold text-blue-500">{dashboard.total_blogs || 0}</p>
                      </div>
                      <div className="text-5xl opacity-30"><i className="fas fa-book"></i></div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Total Views</h3>
                        <p className="text-4xl font-bold text-green-500">{dashboard.total_views || 0}</p>
                      </div>
                      <div className="text-5xl opacity-30"><i className="fas fa-eye"></i></div>
                    </div>
                  </div>
                  <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg hover:shadow-xl transition-all`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Total Likes</h3>
                        <p className="text-4xl font-bold text-red-500">{dashboard.total_likes || 0}</p>
                      </div>
                      <div className="text-5xl opacity-30"><i className="fas fa-heart"></i></div>
                    </div>
                  </div>
                </div>

                {dashboard.recent_blogs && dashboard.recent_blogs.length > 0 && (
                  <div>
                    <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}><i className="fas fa-chart-bar mr-2"></i>Recent Blogs</h2>
                    <div className="grid gap-4">
                      {dashboard.recent_blogs.map(blog => (
                        <div key={blog.id} className={`p-4 rounded-lg ${isDark ? 'bg-gray-800 border border-gray-700 hover:border-gray-600' : 'bg-white border border-gray-200 hover:border-gray-300'} transition-all`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{blog.title}</h3>
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{blog.subject}</p>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                              {blog.is_ai_generated ? <><i className="fas fa-robot mr-1"></i>AI</> : <><i className="fas fa-edit mr-1"></i>Manual</>}
                            </span>
                          </div>
                          <div className={`text-sm mt-2 flex gap-4 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                            <span>👁️ {blog.views || 0}</span>
                            <span>❤️ {blog.likes || 0}</span>
                            <span>📅 {formatDateIST(blog.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No data available yet</p>
              </div>
            )}
          </div>
        )}

        {/* Add Blog Tab */}
        {activeTab === 'add' && !loading && (
          <div className="text-center">
            <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Blog</h2>
            <p className={`text-lg mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Choose how you want to create your blog post</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <button
                onClick={() => {
                  setGenerateForm({ subject: '', tone: 'educational' });
                  setGeneratedContent(null);
                  setShowGenerateModal(true);
                }}
                className={`p-8 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                  isDark
                    ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/50 hover:border-blue-400'
                    : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300 hover:border-blue-500'
                }`}
              >
                <div className="text-6xl mb-4">🤖</div>
                <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Generate</h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Let AI create a comprehensive blog post in seconds</p>
              </button>

              <button
                onClick={() => {
                  setCreateForm({
                    title: '',
                    subject: '',
                    content: '',
                    image_url: '',
                    author: 'BioMuseum'
                  });
                  setGeneratedContent(null);
                  setShowCreateModal(true);
                }}
                className={`p-8 rounded-2xl border-2 transition-all transform hover:scale-105 ${
                  isDark
                    ? 'bg-gradient-to-br from-green-900/30 to-teal-900/30 border-green-500/50 hover:border-green-400'
                    : 'bg-gradient-to-br from-green-50 to-teal-50 border-green-300 hover:border-green-500'
                }`}
              >
                <div className="text-6xl mb-4">✏️</div>
                <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Manually</h3>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Write your own blog post with our beautiful form</p>
              </button>
            </div>
          </div>
        )}

        {/* Manage Blogs Tab */}
        {activeTab === 'manage' && !loading && (
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Your Blogs</h2>
            {blogs.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No blogs created yet</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {blogs.map(blog => (
                  <div key={blog.id} className={`p-6 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700 hover:border-gray-600' : 'bg-white border border-gray-200 hover:border-gray-300'} shadow-lg transition-all`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{blog.title}</h3>
                        <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>{blog.subject}</p>
                        <div className={`text-sm flex flex-wrap gap-4 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                          <span>👁️ {blog.views || 0} views</span>
                          <span>❤️ {blog.likes || 0} likes</span>
                          <span>📅 {formatDateIST(blog.created_at)}</span>
                          {blog.is_ai_generated && <span className="px-2 py-1 rounded bg-blue-500/30 text-blue-300 text-xs">🤖 AI Generated</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBlog(blog.id)}
                        className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && !loading && (
          <div>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Community Suggestions</h2>
            {!suggestions || suggestions.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No blog suggestions yet</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {suggestions.map(suggestion => (
                  <div key={suggestion.id} className={`p-6 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg`}>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{suggestion.blog_subject}</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-3`}>💌 From: <span className="font-semibold">{suggestion.user_name}</span> ({suggestion.user_email})</p>
                        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{suggestion.blog_description}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap ${
                        suggestion.status === 'pending' ? (isDark ? 'bg-yellow-500/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                        suggestion.status === 'reviewed' ? (isDark ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-100 text-blue-800') :
                        suggestion.status === 'added' ? (isDark ? 'bg-green-500/30 text-green-300' : 'bg-green-100 text-green-800') :
                        (isDark ? 'bg-gray-500/30 text-gray-300' : 'bg-gray-100 text-gray-800')
                      }`}>
                        {suggestion.status === 'pending' && '⏳ Pending'}
                        {suggestion.status === 'reviewed' && '✓ Reviewed'}
                        {suggestion.status === 'added' && '✅ Added'}
                        {suggestion.status === 'dismissed' && '✗ Dismissed'}
                      </div>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-4`}>
                      📅 {formatDateIST(suggestion.created_at)}
                    </div>
                    {suggestion.status === 'pending' && (
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => handleUpdateSuggestionStatus(suggestion.id, 'reviewed')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all bg-blue-500 hover:bg-blue-600 text-white`}
                        >
                          ✓ Mark Reviewed
                        </button>
                        <button
                          onClick={() => handleUpdateSuggestionStatus(suggestion.id, 'dismissed')}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all bg-gray-500 hover:bg-gray-600 text-white`}
                        >
                          ✗ Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate AI Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>🤖 Generate Blog with AI</h2>
            <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Let AI create a comprehensive biology blog post for you</p>

            <form onSubmit={(e) => { e.preventDefault(); handleGenerateAI(); }} className="space-y-5 mb-6">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Blog Subject *</label>
                <input
                  type="text"
                  placeholder="e.g., How Photosynthesis Works, DNA Replication, Ecosystems"
                  value={generateForm.subject}
                  onChange={(e) => setGenerateForm({ ...generateForm, subject: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-all ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tone</label>
                <select
                  value={generateForm.tone}
                  onChange={(e) => setGenerateForm({ ...generateForm, tone: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-all ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="educational">📚 Educational - Formal and informative</option>
                  <option value="casual">💬 Casual - Friendly and conversational</option>
                  <option value="formal">🎓 Formal - Professional and technical</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generatingAI}
                className={`w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold hover:shadow-lg disabled:opacity-50 transition-all text-lg ${generatingAI ? 'cursor-wait' : ''}`}
              >
                {generatingAI ? '⏳ Generating... Please wait (1-2 minutes)' : '✨ Generate with Intelligence of BioMuseum'}
              </button>
            </form>

            {generatedContent && (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} mb-6 max-h-96 overflow-y-auto border-l-4 border-green-500`}>
                <h3 className={`font-bold mb-3 text-lg ${isDark ? 'text-green-300' : 'text-green-700'}`}>✓ Preview:</h3>
                <p className={`text-sm whitespace-pre-wrap line-clamp-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {generatedContent.content.substring(0, 600)}...
                </p>
              </div>
            )}

            {generatedContent && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold hover:shadow-lg transition-all mb-3 text-lg"
              >
                ✓ Use This Content & Continue
              </button>
            )}

            <button
              onClick={() => {
                setShowGenerateModal(false);
                setGeneratedContent(null);
              }}
              className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create Blog Modal - Full Page */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Header */}
            <div className={`sticky top-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 sm:px-10 py-6 z-50`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {generatedContent ? '✅ Review & Publish' : '✏️ Create New Blog'}
                  </h2>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {generatedContent ? 'Review the AI-generated content and make edits' : 'Write an engaging blog post for your community'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setGeneratedContent(null);
                    setCreateForm({
                      title: '',
                      subject: '',
                      content: '',
                      image_url: '',
                      author: 'BioMuseum'
                    });
                  }}
                  className={`text-3xl hover:opacity-70 transition-all`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="px-6 sm:px-10 py-8">
              {successMessage && (
                <div className="mb-6 p-4 rounded-lg bg-green-500/30 border border-green-500/50 text-green-300 font-semibold">
                  ✅ {successMessage}
                </div>
              )}

              <form onSubmit={handleCreateBlog} className="space-y-6">
                {/* Blog Title */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    📖 Blog Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., The Fascinating World of Microorganisms, Understanding Photosynthesis"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-all text-lg ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    required
                  />
                </div>

                {/* Blog Subject */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    🏷️ Subject/Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Biology, Genetics, Ecology, Marine Life, Cell Biology"
                    value={createForm.subject}
                    onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-all text-lg ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    required
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    🖼️ Cover Image URL <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>(Optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={createForm.image_url}
                    onChange={(e) => setCreateForm({ ...createForm, image_url: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-all ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  {createForm.image_url && (
                    <div className="mt-3 rounded-lg overflow-hidden max-h-48">
                      <img src={createForm.image_url} alt="Preview" className="w-full h-auto object-cover" />
                    </div>
                  )}
                </div>

                {/* Blog Content */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    📝 Blog Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="Write your comprehensive blog content here... Include introduction, multiple detailed sections, key points, and conclusion. You can use line breaks and organize your thoughts clearly."
                    value={createForm.content}
                    onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                    rows="16"
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-all resize-vertical text-base font-mono ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    required
                  />
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    💡 Tip: Write at least 300-500 words for better SEO and reader engagement
                  </p>
                </div>

                {/* Author Name */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    👤 Author Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. Sarah Johnson, BioMuseum Team, Your Name"
                    value={createForm.author}
                    onChange={(e) => setCreateForm({ ...createForm, author: e.target.value })}
                    className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-blue-500 transition-all ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Word Count */}
                <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    📊 Content Length: <span className="font-bold">{createForm.content.split(/\s+/).filter(w => w).length} words</span>
                    {createForm.content.split(/\s+/).filter(w => w).length < 300 && (
                      <span className={`ml-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>⚠️ Aim for 300+ words</span>
                    )}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-6 sticky bottom-0 bg-inherit border-t border-gray-600">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      if (generatedContent) {
                        setShowGenerateModal(true);
                      }
                    }}
                    className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
                      isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold hover:shadow-lg disabled:opacity-50 transition-all text-lg"
                  >
                    {submitLoading ? '⏳ Publishing...' : '🚀 Publish Blog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogAdminPanel;
