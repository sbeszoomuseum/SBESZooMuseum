import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const Leaderboard = ({ isDark }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('points');

  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/leaderboard?sort_by=${filter}`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badge_id) => {
    const badges = {
      'first_submission': { class: 'fa-leaf', color: 'text-green-500' },
      '10_submissions': { class: 'fa-star', color: 'text-yellow-400' },
      '25_submissions': { class: 'fa-star', color: 'text-yellow-400' },
      '50_submissions': { class: 'fa-crown', color: 'text-purple-500' },
      'verified_master': { class: 'fa-circle-check', color: 'text-green-500' },
      '100_points': { class: 'fa-gem', color: 'text-blue-500' },
      '500_points': { class: 'fa-brain', color: 'text-pink-500' }
    };
    return badges[badge_id] || { class: 'fa-medal', color: 'text-gray-500' };
  };

  const getLevelColor = (level) => {
    const colors = {
      1: 'bg-gray-400',
      2: 'bg-blue-400',
      3: 'bg-purple-400',
      4: 'bg-pink-400',
      5: 'bg-red-400',
      6: 'bg-yellow-400'
    };
    return colors[level] || 'bg-gray-400';
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-4 sm:p-6`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            <i className="fa-solid fa-trophy text-yellow-500 mr-2"></i>Leaderboard
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Top contributors to BioMuseum
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'points', label: <><i className="fa-solid fa-star mr-1"></i>Points</> },
            { id: 'submissions', label: <><i className="fa-solid fa-list mr-1"></i>Submissions</> },
            { id: 'verified', label: <><i className="fa-solid fa-circle-check mr-1"></i>Verified</> }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
                filter === btn.id
                  ? 'bg-purple-600 text-white'
                  : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading leaderboard...
          </div>
        ) : (
          <div className={`rounded-lg overflow-hidden shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {leaderboard.map((user, index) => (
              <div
                key={index}
                className={`p-4 border-b ${
                  isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                } transition flex items-center justify-between`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Rank */}
                  <div className={`font-bold text-lg w-8 ${
                    index < 3 ? 'text-yellow-400' : isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {index === 0 ? <i className="fa-solid fa-medal text-yellow-400 text-xl"></i> : index === 1 ? <i className="fa-solid fa-medal text-gray-400 text-xl"></i> : index === 2 ? <i className="fa-solid fa-medal text-orange-400 text-xl"></i> : <span>{index + 1}</span>}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {user.user_name}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Level {user.level}
                    </div>
                  </div>

                  {/* Level Badge */}
                  <div className={`${getLevelColor(user.level)} text-white px-3 py-1 rounded-full font-bold`}>
                    LVL {user.level}
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {filter === 'points' && `${user.points} pts`}
                      {filter === 'submissions' && `${user.total_submissions} subs`}
                      {filter === 'verified' && `${user.verified_submissions} verified`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Badges Section */}
        <div className={`mt-8 rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <i className="fa-solid fa-award text-purple-500 mr-2"></i>Available Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: 'fa-leaf', color: 'text-green-500', name: 'First Step', desc: '1 suggestion' },
              { icon: 'fa-star', color: 'text-yellow-400', name: 'Active', desc: '10 suggestions' },
              { icon: 'fa-star', color: 'text-yellow-400', name: 'Super', desc: '25 suggestions' },
              { icon: 'fa-crown', color: 'text-purple-500', name: 'Legend', desc: '50 suggestions' },
              { icon: 'fa-check-circle', color: 'text-green-500', name: 'Verified', desc: '10 verified' },
              { icon: 'fa-gem', color: 'text-blue-500', name: 'Collector', desc: '100 points' },
              { icon: 'fa-brain', color: 'text-pink-500', name: 'Master Mind', desc: '500 points' }
            ].map((badge, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg text-center ${
                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <div className={`text-4xl mb-2 ${badge.color}`}><i className={`fas ${badge.icon}`}></i></div>
                <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {badge.name}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {badge.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
