import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDateIST } from '../utils/dateFormatter';

const BiotubeAdminPanel = ({ token, isDark }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [videos, setVideos] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [userHistory, setUserHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    youtube_url: '',
    kingdom: '',
    phylum: '',
    class_name: '',
    species: '',
    description: '',
    thumbnail_url: ''
  });
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [editingVideo, setEditingVideo] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const BACKEND_URL = (() => {
    if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
    if (window.location.hostname.includes('vercel.app')) return 'https://sbzoomuseum.onrender.com';
    return 'http://localhost:8000';
  })();
  const API = `${BACKEND_URL}/api`;
  
  // Debug log
  React.useEffect(() => {
    console.log('🎬 BiotubeAdminPanel - Using BACKEND_URL:', BACKEND_URL);
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await axios.get(`${API}/admin/biotube/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboard(res.data);
      } else if (activeTab === 'add' || activeTab === 'manage') {
        const res = await axios.get(`${API}/admin/biotube/videos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVideos(res.data);
      } else if (activeTab === 'suggestions') {
        try {
          const res = await axios.get(`${API}/admin/biotube/suggestions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Suggestions API Response:', res.data);
          console.log('Number of suggestions:', res.data?.length || 0);
          setSuggestions(Array.isArray(res.data) ? res.data : []);
        } catch (apiError) {
          console.error('Error fetching suggestions:', apiError);
          console.error('Error status:', apiError.response?.status);
          console.error('Error data:', apiError.response?.data);
          setSuggestions([]);
          throw apiError;
        }
      } else if (activeTab === 'history') {
        const res = await axios.get(`${API}/admin/biotube/user-history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserHistory(res.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (activeTab === 'suggestions') {
        setSuggestions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSuccessMessage('');

    try {
      await axios.post(`${API}/admin/biotube/videos`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccessMessage('Video added successfully!');
      setFormData({
        title: '',
        youtube_url: '',
        kingdom: '',
        phylum: '',
        class_name: '',
        species: '',
        description: '',
        thumbnail_url: ''
      });
      setThumbnailPreview('');

      setTimeout(() => {
        fetchData();
        setSuccessMessage('');
      }, 1500);
    } catch (error) {
      setSuccessMessage(`Error: ${error.response?.data?.detail || 'Failed to add video'}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      await axios.delete(`${API}/admin/biotube/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Video deleted successfully!');
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      setSuccessMessage('Error deleting video');
    }
  };

  const handleDeleteSuggestion = async (suggestionId) => {
    if (!window.confirm('Are you sure you want to delete this suggestion?')) return;
    
    try {
      await axios.delete(`${API}/admin/biotube/suggestions/${suggestionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('Suggestion deleted successfully!');
      setTimeout(() => {
        fetchData();
        setSuccessMessage('');
      }, 1500);
    } catch (error) {
      setSuccessMessage(`Error: ${error.response?.data?.detail || 'Failed to delete suggestion'}`);
    }
  };

  const handleUpdateSuggestionStatus = async (suggestionId, newStatus) => {
    try {
      await axios.put(
        `${API}/admin/biotube/suggestions/${suggestionId}/status?new_status=${newStatus}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMessage(`Suggestion marked as "${newStatus}"!`);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      setSuccessMessage('Error updating suggestion');
    }
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-semibold z-[9999] ${
      message.includes('Error') ? 'bg-red-500' : 'bg-green-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <i className="fa-solid fa-video text-purple-500 mr-2"></i>BioTube Admin Panel
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage Videos, Suggestions, and User Content
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0 overflow-x-auto">
          {[
            { id: 'dashboard', label: <><i className="fa-solid fa-chart-line mr-1"></i>Dashboard</> },
            { id: 'add', label: <><i className="fa-solid fa-plus mr-1"></i>Add Video</> },
            { id: 'manage', label: <><i className="fa-solid fa-pen-to-square mr-1"></i>Manage Videos</> },
            { id: 'suggestions', label: <><i className="fa-solid fa-lightbulb mr-1"></i>Suggestions</> },
            { id: 'history', label: <><i className="fa-solid fa-users mr-1"></i>User History</> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? isDark
                    ? 'border-purple-500 text-purple-400'
                    : 'border-purple-600 text-purple-600'
                  : isDark
                  ? 'border-transparent text-gray-400 hover:text-gray-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={`flex items-center gap-3 ${successMessage.includes('Error') ? 'bg-red-500' : 'bg-green-500'} text-white p-4 text-center font-semibold`}>
          <i className={`fa-solid ${successMessage.includes('Error') ? 'fa-circle-xmark' : 'fa-circle-check'} text-lg`}></i>
          {successMessage}
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
          </div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && dashboard && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard isDark={isDark} icon={<i className="fa-solid fa-video"></i>} title="Total Videos" value={dashboard.total_videos} />
                <StatCard isDark={isDark} icon={<i className="fa-solid fa-eye"></i>} title="Public Videos" value={dashboard.public_videos} />
                <StatCard isDark={isDark} icon={<i className="fa-solid fa-lightbulb"></i>} title="Pending Suggestions" value={dashboard.pending_suggestions} />
                <StatCard isDark={isDark} icon={<i className="fa-solid fa-tags"></i>} title="Categories" value={dashboard.categories_count} />

                {/* Recently Added */}
                <div className={`lg:col-span-4 rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <i className="fa-solid fa-tv mr-2"></i>Recently Added
                  </h2>
                  <div className="space-y-3">
                    {dashboard.recently_added && dashboard.recently_added.length > 0 ? (
                      dashboard.recently_added.map(vid => (
                        <div key={vid.id} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{vid.title}</p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatDateIST(vid.created_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No videos added yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ADD VIDEO TAB */}
            {activeTab === 'add' && (
              <div className={`rounded-lg p-6 w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ➕ Add New Video
                </h2>

                <form onSubmit={handleAddVideo} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Video Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className={`w-full px-4 py-2 rounded border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="e.g., Lion Hunting Techniques"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      YouTube URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.youtube_url}
                      onChange={(e) => setFormData({...formData, youtube_url: e.target.value})}
                      className={`w-full px-4 py-2 rounded border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Kingdom *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.kingdom}
                        onChange={(e) => setFormData({...formData, kingdom: e.target.value})}
                        className={`w-full px-4 py-2 rounded border ${
                          isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                        placeholder="e.g., Animalia"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Phylum *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.phylum}
                        onChange={(e) => setFormData({...formData, phylum: e.target.value})}
                        className={`w-full px-4 py-2 rounded border ${
                          isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                        placeholder="e.g., Chordata"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Class *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.class_name}
                        onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                        className={`w-full px-4 py-2 rounded border ${
                          isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                        placeholder="e.g., Mammalia"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Species *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.species}
                        onChange={(e) => setFormData({...formData, species: e.target.value})}
                        className={`w-full px-4 py-2 rounded border ${
                          isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                        placeholder="e.g., Panthera leo"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Thumbnail URL
                    </label>
                    <input
                      type="url"
                      value={formData.thumbnail_url}
                      onChange={(e) => {
                        setFormData({...formData, thumbnail_url: e.target.value});
                        setThumbnailPreview(e.target.value);
                      }}
                      className={`w-full px-4 py-2 rounded border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                    {thumbnailPreview && (
                      <div className="mt-3 rounded-lg overflow-hidden bg-black max-w-xs">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail Preview"
                          className="w-full h-auto"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/320x180?text=Invalid+URL';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className={`w-full px-4 py-2 rounded border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Video description..."
                      rows="4"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-all"
                  >
                    {submitLoading ? 'Adding...' : <><i className="fa-solid fa-circle-check mr-1"></i>Add Video</>}
                  </button>
                </form>
              </div>
            )}

            {/* MANAGE VIDEOS TAB */}
            {activeTab === 'manage' && (
              <div>
                <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <i className="fa-solid fa-pen-to-square mr-2"></i>Manage Videos
                </h2>
                {videos.length === 0 ? (
                  <div className={`p-6 text-center rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No videos yet. Add one!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {videos.map((video) => (
                      <div
                        key={video.id}
                        className={`rounded-lg overflow-hidden shadow-lg transition-all hover:shadow-xl ${
                          isDark ? 'bg-gray-800' : 'bg-white'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative bg-black aspect-video overflow-hidden">
                          <img
                            src={video.thumbnail_url || 'https://via.placeholder.com/320x180?text=No+Thumbnail'}
                            alt={video.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/320x180?text=Thumbnail';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
                            <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
                              video.visibility === 'public'
                                ? isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                                : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-800'
                            }`}>
                              {video.visibility}
                            </span>
                          </div>
                        </div>

                        {/* Video Info */}
                        <div className="p-4">
                          <h3 className={`font-semibold line-clamp-2 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {video.title}
                          </h3>
                          <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {video.species}
                          </p>

                          {/* QR Code */}
                          {video.qr_code && (
                            <div className="mb-4 p-2 bg-white rounded-lg flex justify-center">
                              <img
                                src={video.qr_code}
                                alt="QR Code"
                                className="w-24 h-24"
                              />
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2">
                            {video.qr_code && (
                              <button
                                onClick={() => {
                                  const printWindow = window.open('', '', 'width=300,height=400');
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>${video.title}</title>
                                        <style>
                                          body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial; }
                                          h2 { margin: 20px 0 10px; text-align: center; }
                                          img { width: 200px; height: 200px; margin: 20px; }
                                          p { text-align: center; margin: 10px 0; }
                                        </style>
                                      </head>
                                      <body>
                                        <h2>${video.title}</h2>
                                        <img src="${video.qr_code}" alt="QR Code" />
                                        <p>Scan to watch this video</p>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                  printWindow.print();
                                }}
                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-all text-sm"
                              >
                                <i className="fa-solid fa-print mr-1"></i>Print QR
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteVideo(video.id)}
                              className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-all text-sm"
                            >
                              <i className="fa-solid fa-trash mr-1"></i>Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUGGESTIONS TAB */}
            {activeTab === 'suggestions' && (
              <div className="space-y-4">
                {suggestions.map((sugg) => (
                  <div key={sugg.id} className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {sugg.video_title}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          By: {sugg.user_name} ({sugg.user_class})
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        sugg.status === 'pending'
                          ? isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                          : isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                      }`}>
                        {sugg.status}
                      </span>
                    </div>

                    {sugg.video_description && (
                      <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {sugg.video_description}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateSuggestionStatus(sugg.id, 'reviewed')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-all"
                      >
                        <i className="fa-solid fa-circle-check mr-1"></i>Reviewed
                      </button>
                      <button
                        onClick={() => handleUpdateSuggestionStatus(sugg.id, 'added')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-all"
                      >
                        ➕ Added
                      </button>
                      <button
                        onClick={() => handleUpdateSuggestionStatus(sugg.id, 'dismissed')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-all"
                      >
                        ✕ Dismissed
                      </button>
                    </div>
                  </div>
                ))}
                {suggestions.length === 0 && (
                  <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No suggestions yet</p>
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                      <i className="fa-solid fa-lightbulb mr-2"></i>Go to the Biotube home page and click "Suggest Video" to submit suggestions
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* USER HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {Object.keys(userHistory).length === 0 ? (
                  <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No user history yet</p>
                  </div>
                ) : (
                  Object.entries(userHistory).map(([userName, suggestions]) => (
                    <div key={userName} className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          <i className="fa-solid fa-user mr-2"></i>{userName}
                        </h3>
                        <span className={`text-sm px-3 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                          {suggestions.length} suggestions
                        </span>
                      </div>
                      <div className="space-y-3">
                        {suggestions.map((sugg) => (
                          <div key={sugg.id} className={`p-4 rounded flex justify-between items-start gap-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <div className="flex-1">
                              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {sugg.video_title}
                              </p>
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Class: {sugg.user_class} | Status: <span className={`font-semibold ${
                                  sugg.status === 'pending' ? 'text-yellow-400' : sugg.status === 'added' ? 'text-green-400' : 'text-gray-400'
                                }`}>{sugg.status}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteSuggestion(sugg.id)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all text-sm font-semibold flex-shrink-0 whitespace-nowrap"
                              title="Delete this suggestion"
                            >
                              ✕ Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ isDark, icon, title, value }) => (
  <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
    <div className="text-4xl mb-2">{icon}</div>
    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
    <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
  </div>
);

export default BiotubeAdminPanel;
