import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const AnalyticsDashboard = ({ isDark }) => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendingOrganisms, setTrendingOrganisms] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const [statsRes, trendsRes, orgRes, contribRes] = await Promise.all([
        axios.get(`${API}/admin/analytics/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/analytics/trends`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/analytics/trending-organisms`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/analytics/top-contributors`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(statsRes.data);
      setTrends(trendsRes.data);
      setTrendingOrganisms(orgRes.data);
      setTopContributors(contribRes.data);
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, subtext, color }) => (
    <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`text-3xl ${color}`}>{icon}</div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </div>
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {label}
          </div>
        </div>
      </div>
      {subtext && (
        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {subtext}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-4 sm:p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
            <i className="fa-solid fa-chart-bar text-blue-500 mr-2"></i>Analytics Dashboard
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Platform performance and engagement metrics
          </p>
        </div>

        {/* Key Metrics */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<i className="fa-solid fa-paw text-green-500 text-3xl"></i>}
              label="Total Organisms"
              value={stats.total_organisms}
              color="text-green-500"
            />
            <StatCard
              icon={<i className="fa-solid fa-film text-blue-500 text-3xl"></i>}
              label="Total Videos"
              value={stats.total_videos}
              color="text-blue-500"
            />
            <StatCard
              icon={<i className="fa-solid fa-lightbulb text-purple-500 text-3xl"></i>}
              label="Suggestions"
              value={stats.total_suggestions}
              subtext={`${stats.pending_suggestions} pending`}
              color="text-purple-500"
            />
            <StatCard
              icon={<i className="fa-solid fa-users text-pink-500 text-3xl"></i>}
              label="Contributors"
              value={stats.unique_contributors}
              color="text-pink-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Approval Rate */}
          {stats && (
            <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <i className="fa-solid fa-circle-check text-green-500 mr-2"></i>Approval Rate
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {stats.suggestion_approval_rate.toFixed(1)}%
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    of suggestions approved
                  </div>
                </div>
                <div className={`text-6xl opacity-20`}><i className="fa-solid fa-circle-check"></i></div>
              </div>
              <div className={`w-full bg-gray-300 rounded-full h-4 mt-4 ${isDark ? 'bg-gray-700' : ''}`}>
                <div
                  className="bg-green-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.suggestion_approval_rate}%` }}
                />
              </div>
            </div>
          )}

          {/* Growth Trends */}
          {trends && (
            <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <i className="fa-solid fa-chart-line text-purple-500 mr-2"></i>Growth (Last 30 Days)
              </h2>
              <div className="space-y-3">
                <div>
                  <div className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    New Organisms
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {trends.new_organisms}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {trends.daily_average_organisms.toFixed(2)}/day
                  </div>
                </div>
                <div>
                  <div className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    New Videos
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {trends.new_videos}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {trends.daily_average_videos.toFixed(2)}/day
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trending Organisms */}
        <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-8`}>
          <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <i className="fa-solid fa-fire text-red-500 mr-2"></i>Trending Organisms
          </h2>
          <div className="space-y-3">
            {trendingOrganisms.slice(0, 5).map((org, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {idx + 1}. {org.organism_name}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {org.view_count} views • {org.comment_count} comments
                    </div>
                  </div>
                  <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {org.total_interactions}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <i className="fa-solid fa-users text-blue-500 mr-2"></i>Top Contributors
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    User
                  </th>
                  <th className={`text-center py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Submissions
                  </th>
                  <th className={`text-center py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Approved
                  </th>
                  <th className={`text-center py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Pending
                  </th>
                  <th className={`text-center py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dismissed
                  </th>
                </tr>
              </thead>
              <tbody>
                {topContributors.slice(0, 10).map((user, idx) => (
                  <tr
                    key={idx}
                    className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <td className={`py-3 px-2 font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {user.user_name}
                    </td>
                    <td className={`text-center py-3 px-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {user.total_suggestions}
                    </td>
                    <td className={`text-center py-3 px-2 text-green-500 font-semibold`}>
                      {user.approved}
                    </td>
                    <td className={`text-center py-3 px-2 text-yellow-500 font-semibold`}>
                      {user.pending}
                    </td>
                    <td className={`text-center py-3 px-2 text-red-500 font-semibold`}>
                      {user.dismissed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
