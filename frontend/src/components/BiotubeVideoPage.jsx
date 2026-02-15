import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { formatDateIST } from '../utils/dateFormatter';

const BiotubeVideoPage = ({ isDark }) => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, getAuthHeader } = useAuth();
  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerMode, setPlayerMode] = useState('normal'); // normal, theater
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentForm, setCommentForm] = useState({ user_name: '', user_class: '', text: '' });
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (
    window.location.hostname.includes('vercel.app')
      ? 'https://biomuseum.onrender.com'
      : 'http://localhost:8000'
  );
  const API = `${BACKEND_URL}/api`;

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  useEffect(() => {
    if (video) {
      fetchRelatedVideos();
      fetchComments();
    }
  }, [video]);

  // Auto-fill comment form when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      setCommentForm(prev => ({
        ...prev,
        user_name: user.name || '',
        user_class: user.email || ''
      }));
    } else {
      setCommentForm({ user_name: '', user_class: '', text: '' });
    }
  }, [isAuthenticated, user]);

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await axios.get(`${API}/biotube/videos/${videoId}/comments`);
      setComments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/biotube/videos/${videoId}`);
      setVideo(response.data);
    } catch (error) {
      console.error('Error fetching video:', error);
      navigate('/biotube');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedVideos = async () => {
    try {
      const response = await axios.get(`${API}/biotube/videos/${videoId}/related`);
      setRelatedVideos(response.data);
    } catch (error) {
      console.error('Error fetching related videos:', error);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentForm.user_name || !commentForm.user_class || !commentForm.text) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setCommentSubmitting(true);
      await axios.post(`${API}/biotube/videos/${videoId}/comments`, commentForm);
      setCommentForm({ user_name: '', user_class: '', text: '' });
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    
    try {
      await axios.delete(`${API}/admin/biotube/comments/${commentId}`);
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      await axios.put(`${API}/biotube/comments/${commentId}/like`);
      fetchComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-4xl mb-4"><i className="fas fa-video"></i></div>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Video not found</p>
          <button
            onClick={() => navigate('/biotube')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            ← Back to Biotube
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Back Button */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} p-4`}>
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/biotube')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isDark
                ? 'hover:bg-gray-700 text-gray-300'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            ← Back to Biotube
          </button>
        </div>
      </div>

      <div className={`${playerMode === 'theater' ? 'px-4 sm:px-6 py-4' : 'max-w-6xl mx-auto px-4 sm:px-6 py-8'}`}>
        <div className={`${playerMode === 'theater' ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-4 gap-6'}`}>
          {/* Main Video Section */}
          <div className={playerMode === 'theater' ? 'w-full' : 'lg:col-span-3'}>
            {/* Video Player */}
            <div className={`rounded-lg overflow-hidden shadow-lg mb-6 ${isDark ? 'bg-black' : 'bg-black'}`}>
              <div className={playerMode === 'theater' ? 'aspect-video relative bg-black' : 'aspect-video relative bg-black'}>
                <iframe
                  title={video.title}
                  width="100%"
                  height={playerMode === 'theater' ? '800' : '600'}
                  src={`https://www.youtube.com/embed/${video.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]}?rel=0&modestbranding=1`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ minHeight: playerMode === 'theater' ? '600px' : '600px' }}
                />
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setPlayerMode('normal')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  playerMode === 'normal'
                    ? isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'
                }`}
              >
                <i className="fas fa-video mr-2"></i>Normal
              </button>
              <button
                onClick={() => setPlayerMode('theater')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  playerMode === 'theater'
                    ? isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                    : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'
                }`}
              >
                <i className="fas fa-window-maximize mr-2"></i>Theater Mode
              </button>
            </div>

            {/* Video Info */}
            {playerMode !== 'theater' && (
            <div className={`rounded-lg p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h1 className={`text-2xl sm:text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {video.title}
              </h1>

              {/* Taxonomy */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>KINGDOM</p>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{video.kingdom}</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>PHYLUM</p>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{video.phylum}</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>CLASS</p>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{video.class_name}</p>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SPECIES</p>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{video.species}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <i className="fas fa-file-alt mr-2"></i>Description
                </h2>
                <p className={`text-base leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {video.description || 'No description available for this video.'}
                </p>
              </div>

              {/* Comments Section */}
              <div className="mt-8">
                <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <i className="fas fa-comment mr-2"></i>Comments ({comments.length})
                </h2>

                {/* Add Comment Form - Always visible */}
                <form onSubmit={handlePostComment} className="mb-8">
                  <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Your name"
                        value={commentForm.user_name}
                        onChange={(e) => setCommentForm({...commentForm, user_name: e.target.value})}
                        className={`px-3 py-2 rounded border ${
                          isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Your class/grade"
                        value={commentForm.user_class}
                        onChange={(e) => setCommentForm({...commentForm, user_class: e.target.value})}
                        className={`px-3 py-2 rounded border ${
                          isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                        }`}
                      />
                    </div>
                    <textarea
                      placeholder="Add a comment..."
                      value={commentForm.text}
                      onChange={(e) => setCommentForm({...commentForm, text: e.target.value})}
                      className={`w-full px-3 py-2 rounded border resize-none ${
                        isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                      }`}
                      rows="3"
                    />
                    <div className="flex gap-2 mt-3 justify-end">
                      <button
                        type="submit"
                        disabled={commentSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded font-semibold transition-all"
                      >
                        {commentSubmitting ? 'Posting...' : 'Post Comment'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Comments List */}
                {commentsLoading ? (
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No comments yet. Be the first to comment!</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {comment.user_name}
                            </h4>
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {comment.user_class} • {formatDateIST(comment.created_at)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="px-2 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                          >
                            Delete
                          </button>
                        </div>
                        <p className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {comment.text}
                        </p>
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={`text-sm font-semibold transition-all ${
                            isDark
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                        >
                          <i className="fas fa-thumbs-up mr-2"></i>Like ({comment.likes})
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Sidebar - Related Videos */}
          {playerMode !== 'theater' && (
            <div className="lg:col-span-1">
              <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <i className="fas fa-film mr-2"></i>Related Videos
              </h2>

              <div className="space-y-4">
                {relatedVideos.length === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No related videos found
                  </p>
                ) : (
                  relatedVideos.map((relatedVideo) => (
                    <a
                      key={relatedVideo.id}
                      href={`/biotube/watch/${relatedVideo.id}`}
                      className={`block rounded-lg overflow-hidden transition-all hover:shadow-lg ${
                        isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative bg-black aspect-video overflow-hidden mb-2">
                        <img
                          src={relatedVideo.thumbnail_url}
                          alt={relatedVideo.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/240x135?text=Video';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <div className="text-white text-2xl"><i className="fas fa-play"></i></div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2">
                        <h3 className={`text-sm font-semibold line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {relatedVideo.title}
                        </h3>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                            {relatedVideo.kingdom}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                            {relatedVideo.species}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiotubeVideoPage;
