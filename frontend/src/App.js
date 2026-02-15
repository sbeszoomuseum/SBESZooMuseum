import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import axios from "axios";
import { QrReader } from 'react-qr-reader';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { QRCodeSVG } from 'qrcode.react';
import BiotubeHomepage from './components/BiotubeHomepage';
import BiotubeVideoPage from './components/BiotubeVideoPage';
import BiotubeAdminPanel from './components/BiotubeAdminPanel';
import AboutUs from './components/AboutUs';
import BlogHomepage from './components/BlogHomepage';
import BlogDetailPage from './components/BlogDetailPage';
import BlogAdminPanel from './components/BlogAdminPanel';
import PersonalizationAdminPanel from './components/PersonalizationAdminPanel';
import BioMuseumAIChatbot from './components/BioMuseumAIChatbot';
import { AuthProvider } from './context/AuthContext';
import { SiteProvider, SiteContext } from './contexts/SiteContext';
import { formatDateIST } from './utils/dateFormatter';
import "./App.css";

// Determine backend URL based on current location
const BACKEND_URL = (() => {
  // IMPORTANT: During development, always use localhost:8000
  // Check if this is development (not built)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode - Using backend at http://localhost:8000');
    return 'http://localhost:8000';
  }
  
  // If env var is set, use it
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // On deployed Vercel (biomuseumsbes.vercel.app), use Render backend
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://biomuseum.onrender.com';
  }
  
  // On localhost, use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  
  // Fallback to localhost
  return 'http://localhost:8000';
})();

const API = `${BACKEND_URL}/api`;
console.log('🔌 API Base URL:', API);

// Configure axios with longer timeout
axios.defaults.timeout = 30000; // 30 seconds for long operations

// Simple toast notification function
const showToast = (message, type = 'success', duration = 3000) => {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg text-white text-sm sm:text-base font-semibold z-[9999] animate-pulse ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    'bg-blue-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
};

// Utility function to capitalize first letter of organism name
const capitalizeOrganismName = (name) => {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Theme Context
const ThemeContext = React.createContext();

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme_mode');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme_mode', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Context for admin authentication
const AdminContext = React.createContext();

const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('admin_token'));
  const [token, setToken] = useState(localStorage.getItem('admin_token'));

  const login = (token) => {
    localStorage.setItem('admin_token', token);
    setToken(token);
    setIsAdmin(true);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setIsAdmin(false);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, token, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

// Homepage Component
const Homepage = () => {
  const [organisms, setOrganisms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const { login } = React.useContext(AdminContext);
  const { isDark, toggleTheme } = React.useContext(ThemeContext);
  const { siteSettings } = React.useContext(SiteContext);

  useEffect(() => {
    fetchOrganisms();
  }, []);

  const fetchOrganisms = async () => {
    try {
      const response = await axios.get(`${API}/organisms`);
      setOrganisms(response.data);
    } catch (error) {
      console.error('Error fetching organisms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchOrganisms();
      return;
    }

    try {
      const response = await axios.get(`${API}/search?q=${searchTerm}`);
      setOrganisms(response.data);
    } catch (error) {
      console.error('Error searching organisms:', error);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    setLoginLoading(true);
    try {
      const response = await axios.post(`${API}/admin/login`, { username, password });
      login(response.data.access_token);
      setShowAdminLogin(false);
      showToast('✅ Welcome Admin! Login successful', 'success', 2500);
      navigate('/admin');
    } catch (error) {
      showToast('❌ Invalid credentials', 'error', 3000);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    const email = prompt('Enter your authorized email:');
    if (!email) return;

    setLoginLoading(true);
    try {
      const response = await axios.post(`${API}/admin/verify-email`, { email });
      if (response.data.success) {
        login(response.data.access_token);
        setShowAdminLogin(false);
        showToast(`✅ Welcome ${response.data.email}!`, 'success', 2500);
        setTimeout(() => navigate('/admin'), 500);
      }
    } catch (error) {
      let errorMsg = 'Email verification failed';
      if (error.response?.data?.detail) {
        errorMsg = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : 'Email verification failed';
      } else if (error.message) {
        errorMsg = error.message;
      }
      showToast(`❌ ${errorMsg}`, 'error', 3000);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setLoginLoading(true);
    try {
      const token = credentialResponse.credential;
      const response = await axios.post(`${API}/admin/google-login`, { token });
      if (response.data.success) {
        login(response.data.access_token);
        setShowAdminLogin(false);
        const adminName = response.data.name || response.data.email;
        showToast(`✅ Welcome ${adminName}!`, 'success', 2500);
        setTimeout(() => navigate('/admin'), 500);
      }
    } catch (error) {
      let errorMsg = 'Google login failed';
      if (error.response?.data?.detail) {
        errorMsg = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : 'Google login failed';
      } else if (error.message) {
        errorMsg = error.message;
      }
      showToast(`❌ ${errorMsg}`, 'error', 3000);
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'} flex items-center justify-center loading-container`}>
        <div className="text-center">
          <div className="mb-6">
            <h2 className={`text-3xl sm:text-4xl font-bold font-poppins ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading</h2>
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-purple-400' : 'bg-purple-600'}`} style={{animationDelay: '0s'}}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-purple-400' : 'bg-purple-600'}`} style={{animationDelay: '0.2s'}}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-purple-400' : 'bg-purple-600'}`} style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <p className={`text-base sm:text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Discovering the wonders of life...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Navbar */}
      <header className={`${isDark ? 'bg-gray-800' : 'bg-gray-700'} shadow-lg sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h1 className="text-lg sm:text-2xl font-bold text-yellow-400"> {siteSettings?.website_name || 'BioMuseum'}</h1>
            </div>
            <div className="flex gap-2 sm:gap-3 items-center">
              <button
                onClick={toggleTheme}
                className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'} px-3 sm:px-4 py-2 rounded font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center gap-1 sm:gap-2`}
              >
                <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i> <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`hamburger-btn ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'} px-3 sm:px-4 py-2 rounded font-semibold text-xs sm:text-sm transition-all duration-300 ${showMenu ? 'active' : ''}`}
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Video Background */}
      <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center">
        <video 
          autoPlay 
          muted 
          loop 
          className="absolute top-0 left-0 w-full h-full object-cover"
          playsInline
        >
          <source src="https://res.cloudinary.com/dhmgyv2ps/video/upload/v1764422065/Generated_File_November_29_2025_-_6_34PM_gvi1ux.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        
        {/* Content Container */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-center mb-6 leading-tight drop-shadow-lg max-w-4xl">
            {siteSettings?.website_name || 'BioMuseum'} - A Journey Through Living Wonders
          </h1>
          
          {/* Description */}
          <p className="text-sm sm:text-base lg:text-lg text-white text-center mb-8 drop-shadow-md max-w-3xl leading-relaxed">
            Discover the wonders of life science through our interactive biology museum. Learn about diverse organisms and their fascinating characteristics from {siteSettings?.college_name || 'SBES College of Science'}.
          </p>
          
          {/* Divider Line */}
          <div className="w-full max-w-md h-px bg-white mb-8 opacity-80"></div>
          
          {/* Institution Branding */}
          <div className="text-center text-white drop-shadow-lg">
            <p className="text-xs sm:text-sm font-semibold mb-2 tracking-wide">
              {siteSettings?.initiative_text || 'AN INITIATIVE BY'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              {siteSettings?.college_name || 'S.B.E.S. COLLEGE OF SCIENCE'}
            </h2>
            <p className="text-xs sm:text-sm font-semibold tracking-wide mb-6">
              {siteSettings?.department_name || 'DEPARTMENT OF ZOOLOGY | ZOOLOGICAL MUSEUM'}
            </p>
            {/* Logo Display */}
            {siteSettings?.logo_url && (
              <div className="flex justify-center">
                <img
                  src={siteSettings.logo_url}
                  alt="Institution Logo"
                  className="h-32 sm:h-40 md:h-48 object-contain drop-shadow-xl"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated Sidebar Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-fade"
            onClick={() => setShowMenu(false)}
          ></div>

          {/* Sidebar */}
          <div
            className={`relative ml-auto w-64 h-screen ${
              isDark ? 'bg-gray-800' : 'bg-gray-700'
            } shadow-2xl transform transition-transform duration-400 ease-out sidebar-enter ${
              showMenu ? 'translate-x-0' : 'translate-x-full'
            } flex flex-col`}
          >
            {/* Close Button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setShowMenu(false)}
                className="text-white hover:text-gray-300 text-2xl transition-colors duration-300"
              >
                ✕
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 px-6 py-4">
              <ul className="space-y-3 flex flex-col">
                <li className="menu-item">
                  <button
                    onClick={() => {
                      navigate('/organisms');
                      setShowMenu(false);
                    }}
                    className="menu-text w-full text-left text-white hover:text-yellow-400 py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <i className="fas fa-binoculars"></i>
                    <span>Explore</span>
                  </button>
                </li>
                <li className="menu-item">
                  <button
                    onClick={() => {
                      navigate('/biotube');
                      setShowMenu(false);
                    }}
                    className="menu-text w-full text-left text-white hover:text-yellow-400 py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <i className="fas fa-video"></i>
                    <span>BioTube</span>
                  </button>
                </li>
                <li className="menu-item">
                  <button
                    onClick={() => {
                      setShowSuggestionModal(true);
                      setShowMenu(false);
                    }}
                    className="menu-text w-full text-left text-white hover:text-yellow-400 py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <i className="fas fa-lightbulb"></i>
                    <span>Suggest Species</span>
                  </button>
                </li>
                <li className="menu-item">
                  <button
                    onClick={() => {
                      setShowAdminLogin(true);
                      setShowMenu(false);
                    }}
                    className="menu-text w-full text-left text-white hover:text-yellow-400 py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <i className="fas fa-shield-alt"></i>
                    <span>Admin Login</span>
                  </button>
                </li>
                <li className="menu-item border-t border-gray-600 pt-3 mt-3">
                  <button
                    onClick={() => {
                      navigate('/about');
                      setShowMenu(false);
                    }}
                    className="menu-text w-full text-left text-white hover:text-yellow-400 py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <i className="fas fa-info-circle"></i>
                    <span>About Us</span>
                  </button>
                </li>
                <li className="menu-item">
                  <button
                    onClick={() => {
                      navigate('/blogs');
                      setShowMenu(false);
                    }}
                    className="menu-text w-full text-left text-white hover:text-yellow-400 py-3 px-4 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <i className="fas fa-book"></i>
                    <span>Blog</span>
                  </button>
                </li>
              </ul>
            </nav>

            {/* Footer in Sidebar */}
            <div className="border-t border-gray-600 p-4">
              <p className="text-gray-400 text-sm text-center">© 2025 {siteSettings?.website_name || 'BioMuseum'}</p>
            </div>
          </div>
        </div>
      )}

      {showSuggestionModal && (
        <SuggestionModal 
          isDark={isDark} 
          onClose={() => setShowSuggestionModal(false)}
          token={null}
        />
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className={`fixed inset-0 ${isDark ? 'bg-black bg-opacity-70' : 'bg-black bg-opacity-50'} flex items-center justify-center z-50 p-4 sm:p-0`}>
          <div className={`${isDark ? 'bg-gray-800 border-green-600' : 'bg-white'} rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-auto border-t-4`}>
            <div className="text-center mb-6 sm:mb-8">
              <div className="text-4xl mb-2"><i className="fa-solid fa-key"></i></div>
              <h2 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Admin Login</h2>
            </div>
            <form onSubmit={handleAdminLogin}>
              <div className="mb-4 sm:mb-5">
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <i className="fas fa-user mr-2 text-green-600"></i>Username
                </label>
                <input
                  type="text"
                  name="username"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition-all text-sm sm:text-base ${isDark ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-900' : 'border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'}`}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="mb-6 sm:mb-8">
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <i className="fas fa-lock mr-2 text-green-600"></i>Password
                </label>
                <input
                  type="password"
                  name="password"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none transition-all text-sm sm:text-base ${isDark ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-900' : 'border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'}`}
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="flex gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className={`flex-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-500 hover:bg-gray-600'} text-white py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base`}
                >
                  <i className="fas fa-times mr-1"></i>Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loginLoading ? 'Logging in...' : <><i className="fas fa-sign-in-alt mr-1"></i>Login</>}
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                <div className="flex items-center justify-center">
                  <GoogleOAuthProvider clientId="834932134878-mu46t9129ovalq4pcqofre2mgbu37aj1.apps.googleusercontent.com">
                    <div className="w-full google-signin-button">
                      <GoogleLogin 
                        onSuccess={handleGoogleLogin} 
                        onError={(error) => {
                          console.error('Google login error:', error);
                          alert(`Google login failed: ${error?.error || 'Unknown error'}`);
                        }}
                        theme={isDark ? 'dark' : 'light'}
                        size="large"
                        width="100%"
                        text="signin_with"
                      />
                    </div>
                  </GoogleOAuthProvider>
                </div>
                <p className={`text-center text-xs mt-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Only Authorized E-mails can Access Admin Panel
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// QR Scanner Component
const QRScanner = () => {
  const [error, setError] = useState('');
  const [scannedData, setScannedData] = useState('');
  const navigate = useNavigate();

  const handleScan = (result, error) => {
    if (result) {
      setScannedData(result.text);
      
      // Check if it's a museum organism URL
      const organismMatch = result.text.match(/\/organism\/([a-f0-9-]+)/);
      if (organismMatch) {
        navigate(`/organism/${organismMatch[1]}`);
      } else {
        setError('QR code does not contain a valid organism link');
      }
    }
    
    if (error) {
      console.error('QR Scanner Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-green-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="mb-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📱 QR Code Scanner</h1>
          <p className="text-gray-600">Scan a QR code on any specimen to learn more</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="max-w-md mx-auto">
            <QrReader
              onResult={handleScan}
              style={{ width: '100%' }}
              constraints={{ facingMode: 'environment' }}
            />
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {scannedData && (
            <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              <strong>Scanned:</strong> {scannedData}
            </div>
          )}
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>• Allow camera access when prompted</p>
            <p>• Point your camera at the QR code</p>
            <p>• Make sure the QR code is well-lit and in focus</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Organism Detail Component
const OrganismDetail = () => {
  const { id } = useParams();
  const [organism, setOrganism] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = React.useContext(ThemeContext);

  useEffect(() => {
    fetchOrganism();
  }, [id]);

  const fetchOrganism = async () => {
    try {
      const response = await axios.get(`${API}/organisms/${id}`);
      setOrganism(response.data);
    } catch (error) {
      console.error('Error fetching organism:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'} flex items-center justify-center`}>
        <div className="text-center px-4">
          <div className="text-6xl mb-6 animate-bounce"><i className="fa-solid fa-spinner"></i></div>
          <p className="text-lg font-semibold text-gray-800">Wait a Second....</p>
        </div>
      </div>
    );
  }

  if (!organism) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'} flex items-center justify-center`}>
        <div className="text-center px-4">
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Sorry ! We can't Found Anything For You</h2>
          <button
            onClick={() => navigate('/')}
            className={`${isDark ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white px-6 py-2 rounded-lg transition-all`}
          >
             Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'}`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-4">
        <button
          onClick={() => navigate('/')}
          className={`mb-2 sm:mb-4 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-green-400' : 'bg-gray-600 hover:bg-gray-700 text-white'} px-4 py-2 rounded-lg transition-all text-sm sm:text-base`}
        >
          ← Back to Home
        </button>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-xl shadow-lg overflow-hidden border`}>
          {/* Header */}
          <div className={`${isDark ? 'bg-gradient-to-br from-green-800 to-green-900' : 'bg-gradient-to-br from-green-600 to-blue-600'} text-white p-4 sm:p-6`}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{capitalizeOrganismName(organism.name)}</h1>
            <p className="text-lg sm:text-xl italic opacity-90">{organism.scientific_name}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Left Column - Images and QR */}
            <div>
              {organism.images && organism.images.length > 0 && (
                <div className="mb-6">
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}><i className="fa-regular fa-camera"></i> Images</h3>
                  <div className="grid gap-4">
                    {organism.images.map((image, index) => (
                      <div key={index} className={`flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg w-full h-48 sm:h-64 mx-auto`}>
                        <img
                          src={image}
                          alt={`${organism.name} ${index + 1}`}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {organism.qr_code_image && (
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 sm:p-6 rounded-lg`}>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}><i className="fa-solid fa-qrcode"></i> QR Code</h3>
                  <div className="text-center">
                    <img
                      src={organism.qr_code_image}
                      alt="QR Code"
                      className={`mx-auto mb-4 border-2 rounded w-32 h-32 sm:w-40 sm:h-40 ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                    />
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Scan this QR code to share this organism with others
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4 sm:space-y-6">
              {/* Classification */}
              {organism.classification && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}><i className="fa-solid fa-microscope"></i> Classification</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    {Object.entries(organism.classification).map(([key, value]) => (
                      <div key={key} className={`flex justify-between py-2 border-b last:border-b-0 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                        <span className={`font-medium capitalize ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{key}:</span>
                        <span className={isDark ? 'text-gray-200' : 'text-gray-800'}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Morphology */}
              {organism.morphology && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}><i className="fa-solid fa-hands-holding"></i> Morphology</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} whitespace-pre-line text-xs sm:text-sm`}>{organism.morphology}</p>
                  </div>
                </div>
              )}

              {/* Physiology */}
              {organism.physiology && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}><i className="fa-solid fa-bolt"></i> Physiology</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} whitespace-pre-line text-xs sm:text-sm`}>{organism.physiology}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {organism.description && (
                <div>
                  <h3 className={`text-lg sm:text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}><i className="fa-solid fa-file-waveform"></i> Description</h3>
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
                    <p className={`${isDark ? 'text-gray-200' : 'text-gray-700'} whitespace-pre-line text-xs sm:text-sm`}>{organism.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Panel with full functionality
const AdminPanel = () => {
  const { isAdmin, logout, token } = React.useContext(AdminContext);
  const { isDark, toggleTheme } = React.useContext(ThemeContext);
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [organisms, setOrganisms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingOrganism, setEditingOrganism] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [approvedOrganismData, setApprovedOrganismData] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      fetchOrganisms();
    }
  }, [isAdmin]);

  const fetchOrganisms = async () => {
    try {
      const response = await axios.get(`${API}/organisms`);
      setOrganisms(response.data);
    } catch (error) {
      console.error('Error fetching organisms:', error);
    }
  };

  const handleApprovalSuccess = (approvedData) => {
    console.log('🔄 handleApprovalSuccess called with:', approvedData);
    setApprovedOrganismData(approvedData);
    console.log('✅ State updated, switching to add view...');
    setActiveView('add');
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-blue-50'}`}>
      {/* Header */}
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-800'} shadow-lg border-b-4 sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-lg sm:text-2xl font-bold text-white"><i className="fa-solid fa-user-tie"></i> Admin Panel</h1>
            <div className="flex gap-2 sm:gap-3 items-center">
              <button
                onClick={toggleTheme}
                className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-white hover:bg-gray-100 text-gray-800'} px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all`}
              >
                <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
              <button
                onClick={() => navigate('/')}
                className={`${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'} ${isDark ? 'text-white' : 'text-purple-700'} px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all hidden sm:flex items-center gap-1`}
              >
                <i className="fas fa-home"></i> <span>Home</span>
              </button>
              <button
                onClick={() => {
                  logout();
                  showToast('Logged Out Successfully', 'success', 2500);
                  navigate('/');
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-1"
              >
                <i className="fas fa-sign-out-alt"></i> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} sticky top-16 z-30`}>
        <div className="max-w-7xl mx-auto">
          {/* Mobile Menu Button */}
          <div className="sm:hidden flex items-center justify-between px-3 py-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <i className={`fas fa-bars ${isDark ? 'text-white' : 'text-gray-800'}`}></i>
            </button>
          </div>

          {/* Desktop Menu */}
          <div className={`hidden sm:flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'dashboard' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-solid fa-chart-simple"></i> Dashboard
            </button>
            <button
              onClick={() => setActiveView('add')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'add' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-solid fa-plus"></i> Add Organism
            </button>
            <button
              onClick={() => setActiveView('manage')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'manage' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-regular fa-pen-to-square"></i> Manage Organisms
            </button>
            <button
              onClick={() => setActiveView('suggestions')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'suggestions' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-regular fa-lightbulb"></i> Suggested Organisms
            </button>
            <button
              onClick={() => setActiveView('users')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'users' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-solid fa-user-clock"></i> Users History
            </button>
            <button
              onClick={() => setActiveView('biotube')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'biotube' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-solid fa-clapperboard"></i> BioTube
            </button>
            <button
              onClick={() => setActiveView('blogs')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'blogs' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-solid fa-book"></i> Blogs
            </button>
            <button
              onClick={() => setActiveView('personalization')}
              className={`px-6 py-4 font-semibold transition-all ${activeView === 'personalization' 
                ? `border-b-2 ${isDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'}` 
                : `${isDark ? 'text-gray-400 hover:text-purple-400' : 'text-gray-600 hover:text-purple-600'}`}`}
            >
              <i className="fa-solid fa-wand-magic-sparkles"></i> Personalization
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className={`sm:hidden border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'dashboard' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => { setActiveView('add'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'add' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                ➕ Add Organism
              </button>
              <button
                onClick={() => { setActiveView('manage'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'manage' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                📝 Manage Organisms
              </button>
              <button
                onClick={() => { setActiveView('suggestions'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'suggestions' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                💡 Suggested Organisms
              </button>
              <button
                onClick={() => { setActiveView('users'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'users' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                👥 Users History
              </button>
              <button
                onClick={() => { setActiveView('biotube'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'biotube' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                🎬 Biotube
              </button>
              <button
                onClick={() => { setActiveView('blogs'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'blogs' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                📚 Blogs
              </button>
              <button
                onClick={() => { setActiveView('personalization'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold ${activeView === 'personalization' ? (isDark ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
              >
                ✨ Personalization
              </button>
              <button
                onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 font-semibold border-t ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}
              >
                🏠 Home
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {activeView === 'dashboard' && (
          <DashboardView organisms={organisms} isDark={isDark} />
        )}
        {activeView === 'add' && (
          <AddOrganismForm 
            token={token} 
            isDark={isDark}
            initialData={approvedOrganismData}
            onSuccess={() => {
              setApprovedOrganismData(null);
              fetchOrganisms();
              setActiveView('manage');
            }} 
          />
        )}
        {activeView === 'manage' && (
          <ManageOrganisms 
            organisms={organisms}
            token={token}
            isDark={isDark}
            onUpdate={fetchOrganisms}
            onEdit={setEditingOrganism}
          />
        )}
        {activeView === 'suggestions' && (
          <SuggestedOrganismsTab 
            token={token}
            isDark={isDark}
            onApprovalSuccess={handleApprovalSuccess}
          />
        )}
        {activeView === 'users' && (
          <UsersHistoryTab 
            token={token}
            isDark={isDark}
          />
        )}
        {activeView === 'biotube' && (
          <BiotubeAdminPanel
            token={token}
            isDark={isDark}
          />
        )}
        {activeView === 'blogs' && (
          <BlogAdminPanel
            token={token}
            isDark={isDark}
          />
        )}
        {activeView === 'personalization' && (
          <PersonalizationAdminPanel
            token={token}
            isDark={isDark}
          />
        )}
      </main>
    </div>
  );
};

// Suggested Organisms Tab Component
const SuggestedOrganismsTab = ({ token, isDark, onApprovalSuccess }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [verificationResults, setVerificationResults] = useState({});

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/suggestions/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      showToast('Error loading suggestions', 'error');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Check if organism already exists in database
  const handleCheckExistence = async (suggestionId, organismName) => {
    setVerifyingId(suggestionId);
    try {
      const response = await axios.post(
        `${API}/admin/verify-organism-exists`,
        { organism_name: organismName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Store verification result
      setVerificationResults(prev => ({
        ...prev,
        [suggestionId]: response.data
      }));
      
      if (response.data.exists) {
        showToast(`⚠️ "${organismName}" already exists in database!`, 'error', 4000);
      } else {
        showToast(`✅ "${organismName}" is new and can be approved!`, 'success', 3000);
      }
    } catch (error) {
      showToast('Error verifying organism: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyWithAI = async (suggestionId) => {
    setVerifyingId(suggestionId);
    try {
      const response = await axios.post(
        `${API}/admin/suggestions/${suggestionId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the suggestion with verification result
      setSuggestions(prev => prev.map(sugg => 
        sugg.id === suggestionId 
          ? { ...sugg, ai_verification: response.data }
          : sugg
      ));
      
      showToast('✅ Verification completed! Check the results.', 'success', 3000);
    } catch (error) {
      showToast('Error verifying suggestion: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleApprove = async (suggestionId, suggestion) => {
    setApprovingId(suggestionId);
    try {
      // First check if organism already exists
      const existenceCheck = await axios.post(
        `${API}/admin/verify-organism-exists`,
        { organism_name: suggestion.organism_name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (existenceCheck.data.exists) {
        // Organism already exists - auto-reject it
        await axios.put(
          `${API}/admin/suggestions/${suggestionId}/status`,
          null,
          { 
            params: { status: 'rejected' },
            headers: { Authorization: `Bearer ${token}` } 
          }
        );
        
        setSuggestions(prev => prev.filter(sugg => sugg.id !== suggestionId));
        showToast(`❌ Auto-rejected! "${suggestion.organism_name}" already exists in database.`, 'error', 4000);
        return;
      }
      
      // If not a duplicate, proceed with approval
      const response = await axios.post(
        `${API}/admin/suggestions/${suggestionId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Extract organism_data from the response
      const organizmData = response.data.organism_data || response.data;
      
      console.log('🎉 Approval Response:', response.data);
      console.log('📊 Extracted Organism Data:', organizmData);
      
      // Transform to frontend format if needed
      const approvedData = {
        name: organizmData.name || '',
        scientific_name: organizmData.scientific_name || '',
        classification: organizmData.classification || {
          kingdom: '',
          phylum: '',
          class: '',
          order: '',
          family: '',
          genus: '',
          species: ''
        },
        morphology: organizmData.morphology || '',
        physiology: organizmData.physiology || '',
        description: organizmData.description || '',
        images: organizmData.images || []
      };
      
      console.log('✅ Formatted Approved Data:', approvedData);
      
      // Call parent callback with organism data
      if (onApprovalSuccess) {
        console.log('📤 Calling onApprovalSuccess with:', approvedData);
        onApprovalSuccess(approvedData);
      }
      
      // Remove from suggestions list
      setSuggestions(prev => prev.filter(sugg => sugg.id !== suggestionId));
      showToast('✅ Suggestion approved! Form auto-filled in Add Organism tab.', 'success', 3000);
    } catch (error) {
      console.error('❌ Approval Error:', error);
      showToast('Error approving suggestion: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (suggestionId) => {
    if (window.confirm('Are you sure you want to reject this suggestion?')) {
      try {
        await axios.put(
          `${API}/admin/suggestions/${suggestionId}/status`,
          null,
          { 
            params: { status: 'rejected' },
            headers: { Authorization: `Bearer ${token}` } 
          }
        );
        
        setSuggestions(prev => prev.filter(sugg => sugg.id !== suggestionId));
        showToast('❌ Suggestion rejected!', 'error', 3000);
      } catch (error) {
        showToast('Error rejecting suggestion: ' + (error.response?.data?.detail || error.message), 'error');
      }
    }
  };

  const handleDelete = async (suggestionId) => {
    if (window.confirm('Are you sure you want to delete this suggestion?')) {
      try {
        await axios.delete(
          `${API}/admin/suggestions/${suggestionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setSuggestions(prev => prev.filter(sugg => sugg.id !== suggestionId));
        showToast('✅ Suggestion deleted!', 'success', 3000);
      } catch (error) {
        showToast('Error deleting suggestion: ' + (error.response?.data?.detail || error.message), 'error');
      }
    }
  };

  return (
    <div>
      <h2 className={`text-2xl sm:text-3xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        💡 Suggested Organisms
      </h2>

      {loading && (
        <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>⏳ Loading suggestions...</p>
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No pending suggestions</p>
          <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Users will see their suggestions here once submitted.</p>
        </div>
      )}

      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.id} 
            className={`rounded-lg p-4 sm:p-6 transition-all ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-md'}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  👤 Suggested By:
                </p>
                <p className={`text-sm sm:text-base font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {suggestion.user_name}
                </p>
              </div>
              <div>
                <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  🎓 Class/Standard:
                </p>
                <p className={`text-sm sm:text-base font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  {suggestion.educational_level || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  🔬 Organism Name:
                </p>
                <p className={`text-sm sm:text-base font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  {capitalizeOrganismName(suggestion.organism_name)}
                </p>
              </div>
            </div>

            {suggestion.description && (
              <div className="mb-4">
                <p className={`text-xs sm:text-sm font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  📝 Description:
                </p>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {suggestion.description}
                </p>
              </div>
            )}

            {/* NEW: Organism Existence Check Card */}
            {verificationResults[suggestion.id] && (
              <div className={`mb-4 p-3 sm:p-4 rounded-lg border-2 ${
                verificationResults[suggestion.id].exists
                  ? isDark ? 'bg-red-900 border-red-600' : 'bg-red-50 border-red-300'
                  : isDark ? 'bg-green-900 border-green-600' : 'bg-green-50 border-green-300'
              }`}>
                <div className="flex items-start gap-2">
                  <div className={`text-xl sm:text-2xl ${verificationResults[suggestion.id].exists ? '❌' : '✅'}`}></div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm sm:text-base ${
                      verificationResults[suggestion.id].exists
                        ? isDark ? 'text-red-200' : 'text-red-800'
                        : isDark ? 'text-green-200' : 'text-green-800'
                    }`}>
                      {verificationResults[suggestion.id].exists ? 'Already Exists' : 'New Organism'}
                    </p>
                    <p className={`text-xs sm:text-sm mt-1 ${
                      verificationResults[suggestion.id].exists
                        ? isDark ? 'text-red-100' : 'text-red-700'
                        : isDark ? 'text-green-100' : 'text-green-700'
                    }`}>
                      {verificationResults[suggestion.id].message}
                    </p>
                    {verificationResults[suggestion.id].exists && verificationResults[suggestion.id].organism && (
                      <div className={`mt-2 text-xs sm:text-sm ${
                        isDark ? 'text-red-100' : 'text-red-700'
                      }`}>
                        <p><span className="font-semibold">Name:</span> {verificationResults[suggestion.id].organism.name}</p>
                        {verificationResults[suggestion.id].organism.scientific_name && (
                          <p><span className="font-semibold">Scientific:</span> {verificationResults[suggestion.id].organism.scientific_name}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {suggestion.ai_verification && (
              <div className={`mb-4 p-3 sm:p-4 rounded-lg border-2 ${
                suggestion.ai_verification.is_authentic 
                  ? isDark ? 'bg-green-900 border-green-600 text-green-100' : 'bg-green-50 border-green-300 text-green-800'
                  : isDark ? 'bg-red-900 border-red-600 text-red-100' : 'bg-red-50 border-red-300 text-red-800'
              }`}>
                <p className="font-semibold text-xs sm:text-sm mb-1">
                  {suggestion.ai_verification.is_authentic ? '✅ Authentic!' : '❌ Not Authentic'}
                </p>
                <p className="text-xs sm:text-sm">{suggestion.ai_verification.reason}</p>
                {suggestion.ai_verification.is_authentic && (
                  <div className="mt-2 text-xs sm:text-sm">
                    <p><span className="font-semibold">Type:</span> {suggestion.ai_verification.type}</p>
                    <p><span className="font-semibold">Scientific:</span> {suggestion.ai_verification.scientific_name}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
              {/* NEW: Check Existence Button */}
              <button
                onClick={() => handleCheckExistence(suggestion.id, suggestion.organism_name)}
                disabled={verifyingId === suggestion.id}
                className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all"
              >
                {verifyingId === suggestion.id ? '⏳ Checking...' : '🔍 Check Database'}
              </button>

              {!suggestion.ai_verification && (
                <button
                  onClick={() => handleVerifyWithAI(suggestion.id)}
                  disabled={verifyingId === suggestion.id}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all"
                >
                  {verifyingId === suggestion.id ? '⏳ Verifying...' : '🤖 Verify with AI'}
                </button>
              )}
              
              {suggestion.ai_verification?.is_authentic && (
                <button
                  onClick={() => handleApprove(suggestion.id, suggestion)}
                  disabled={approvingId === suggestion.id}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all"
                >
                  {approvingId === suggestion.id ? '⏳ Approving...' : '✅ Approve'}
                </button>
              )}
              
              <button
                onClick={() => handleReject(suggestion.id)}
                className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all"
              >
                ⚠️ Reject
              </button>
              
              <button
                onClick={() => handleDelete(suggestion.id)}
                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
const DashboardView = ({ organisms, isDark }) => {
  return (
    <div>
      <h2 className={`text-2xl sm:text-3xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>📊 Dashboard</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className={`p-6 rounded-lg transition-all ${isDark ? 'bg-green-900 border border-green-700' : 'bg-green-100'} hover:shadow-lg`}>
          <h3 className={`text-lg sm:text-xl font-semibold mb-2 ${isDark ? 'text-green-300' : 'text-green-800'}`}>Total Organisms</h3>
          <p className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{organisms.length}</p>
        </div>
        <div className={`p-6 rounded-lg transition-all ${isDark ? 'bg-blue-900 border border-blue-700' : 'bg-blue-100'} hover:shadow-lg`}>
          <h3 className={`text-lg sm:text-xl font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>With Images</h3>
          <p className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {organisms.filter(org => org.images && org.images.length > 0).length}
          </p>
        </div>
        <div className={`p-6 rounded-lg transition-all ${isDark ? 'bg-purple-900 border border-purple-700' : 'bg-purple-100'} hover:shadow-lg`}>
          <h3 className={`text-lg sm:text-xl font-semibold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>QR Codes</h3>
          <p className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{organisms.length}</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className={`text-xl sm:text-2xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Recent Organisms</h3>
        <div className="space-y-3">
          {organisms.slice(0, 5).map((organism) => (
            <div key={organism.id} className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-all ${isDark ? 'bg-gray-800 border border-gray-700 hover:border-purple-500' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}`}>
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{capitalizeOrganismName(organism.name)}</h4>
                <p className={`text-xs sm:text-sm italic truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{organism.scientific_name}</p>
              </div>
              <span className={`text-xs sm:text-sm ml-2 whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {organism.classification?.kingdom || 'Unknown'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Add Organism Form Component
const AddOrganismForm = ({ token, isDark, onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    scientific_name: '',
    classification: {
      kingdom: '',
      phylum: '',
      class: '',
      order: '',
      family: '',
      genus: '',
      species: ''
    },
    morphology: '',
    physiology: '',
    description: '',
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOrganismName, setAiOrganismName] = useState('');
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiImageOrganism, setAiImageOrganism] = useState('');
  const [isFromCameraFlow, setIsFromCameraFlow] = useState(false); // Track if AI was triggered from camera

  // Auto-fill form when initialData is provided (from camera identification or approval)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('📥 useEffect triggered with initialData:', initialData);
      
      const newFormData = {
        name: initialData.name || '',
        scientific_name: initialData.scientific_name || '',
        classification: initialData.classification || {
          kingdom: '',
          phylum: '',
          class: '',
          order: '',
          family: '',
          genus: '',
          species: ''
        },
        morphology: initialData.morphology || '', // Preserve from approval data
        physiology: initialData.physiology || '', // Preserve from approval data
        description: initialData.description || '', // Preserve from approval data
        images: Array.isArray(initialData.images) ? initialData.images : []
      };
      
      console.log('✏️ Setting formData to:', newFormData);
      setFormData(newFormData);
      
      // Only auto-trigger AI agent if morphology/physiology are empty (camera flow, not approval flow)
      if (initialData.name && !initialData.morphology && !initialData.physiology) {
        console.log('🤖 Marking as camera flow - will auto-trigger AI agent for organism:', initialData.name);
        setAiOrganismName(initialData.name);
        setIsFromCameraFlow(true); // Mark that this is from camera, allow auto-trigger
        // The AI will be triggered in the next useEffect
      } else {
        setIsFromCameraFlow(false); // Not from camera, user will click Generate manually
      }
    } else {
      console.log('⚠️ initialData is empty or null:', initialData);
    }
  }, [initialData]);

  // Auto-trigger AI agent when aiOrganismName is set (from camera - only if name is long enough)
  useEffect(() => {
    if (aiOrganismName.trim().length >= 3 && !aiLoading && isFromCameraFlow) {
      console.log('🤖 Auto-triggering AI agent for camera flow:', aiOrganismName);
      handleAiComplete();
    }
  }, [aiOrganismName, isFromCameraFlow]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('classification.')) {
      const classField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        classification: {
          ...prev.classification,
          [classField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = async (files) => {
    const newImages = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const base64 = await convertToBase64(file);
        newImages.push(base64);
      }
    }
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(Array.from(e.dataTransfer.files));
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleAiComplete = async () => {
    if (!aiOrganismName.trim()) {
      showToast('Please enter an organism name', 'error');
      return;
    }

    setAiLoading(true);
    try {
      const response = await axios.post(`${API}/admin/organisms/ai-complete`, {
        organism_name: aiOrganismName
      }, {
        timeout: 60000 // 60 second timeout for AI
      });

      if (response.data.success) {
        const aiData = response.data.data;
        setFormData(prev => ({
          ...prev,
          name: aiData.name || prev.name,
          scientific_name: aiData.scientific_name || prev.scientific_name,
          classification: aiData.classification || prev.classification,
          morphology: aiData.morphology || prev.morphology,
          physiology: aiData.physiology || prev.physiology,
          description: aiData.general_description || prev.description
        }));
        setShowAiHelper(false);
        setAiOrganismName('');
        showToast('✅ Organism data filled successfully! Review and adjust as needed.', 'success', 3000);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to get AI response';
      showToast('❌ Error: ' + errorMsg, 'error', 3000);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiGenerateImages = async () => {
    if (!aiImageOrganism.trim()) {
      alert('Please enter an organism name for image generation');
      return;
    }

    setAiImageLoading(true);
    try {
      // Generate 3-4 images for the organism
      const response = await axios.post(`${API}/admin/organisms/ai-generate-images`, {
        organism_name: aiImageOrganism,
        count: 4
      }, {
        headers: {
          Authorization: `Bearer ${token}` // Include admin token for authentication
        },
        timeout: 120000 // 2 minute timeout for image generation
      });

      if (response.data.success && response.data.image_urls && response.data.image_urls.length > 0) {
        const newImages = response.data.image_urls;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
        setAiImageOrganism('');
        alert(`✅ ${newImages.length} HD images generated successfully!`);
      } else {
        alert('No images were generated. Please try again.');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message || 'Failed to generate images';
      console.error('Image generation error:', error);
      alert('Error generating images: ' + errorMsg);
    } finally {
      setAiImageLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/organisms`, formData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout
      });
      
      showToast('🎉 Organism added successfully!', 'success', 3000);
      setFormData({
        name: '',
        scientific_name: '',
        classification: {
          kingdom: '', phylum: '', class: '', order: '', family: '', genus: '', species: ''
        },
        morphology: '',
        physiology: '',
        description: '',
        images: []
      });
      onSuccess();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Network error - please check your connection';
      showToast('❌ Error: ' + errorMsg, 'error', 3000);
      console.error('Detailed error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* AI Loading Overlay - Full Screen */}
      {aiLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
          <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center animate-pulse`}>
            <div className="flex justify-center mb-4">
              <div className="text-5xl animate-bounce">
                <i className={`fas fa-brain ${isDark ? 'text-blue-400' : 'text-blue-600'}`}></i>
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Intelligence is processing.....
            </h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              Intelligence is analyzing the organism and generating detailed information
            </p>
            <div className="flex justify-center gap-1">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 w-full">
          <h2 className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>➕ Add New Organism</h2>
          {initialData && (
            <div className={`mt-2 p-2 sm:p-3 rounded-lg inline-block ${isDark ? 'bg-green-900 border-2 border-green-600' : 'bg-green-100 border-2 border-green-500'}`}>
              <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-green-200' : 'text-green-800'}`}>
                ✅ Auto-filled from Approved Suggestion
              </p>
            </div>
          )}
          {aiLoading && (
            <div className={`mt-3 p-4 sm:p-5 rounded-lg inline-block animate-pulse ${isDark ? 'bg-gradient-to-r from-blue-900 to-purple-900 border-2 border-blue-500' : 'bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-500'}`}>
              <div className="flex items-center gap-3">
                <div className="animate-spin text-2xl">
                  <i className={`fas fa-brain ${isDark ? 'text-blue-300' : 'text-blue-600'}`}></i>
                </div>
                <div>
                  <p className={`text-sm font-bold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                     Intelligence is processing.....
                  </p>
                  <p className={`text-xs ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                    AI is analyzing and generating detailed information about the organism
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAiHelper(!showAiHelper)}
          className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 sm:py-3 rounded-lg font-semibold transition-all flex items-center gap-2 justify-center text-sm"
        >
          <i className="fas fa-magic"></i> <span>AI Helper</span>
        </button>
      </div>

      {/* AI Helper Section */}
      {showAiHelper && (
        <div className={`mb-8 p-4 sm:p-6 rounded-xl border-2 shadow-lg ${isDark ? 'bg-purple-900 border-purple-700' : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <i className={`fas fa-robot text-2xl ${isDark ? 'text-purple-400' : 'text-purple-600'}`}></i>
            <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>🤖 AI Organism Assistant</h3>
          </div>
          <p className={`text-xs sm:text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Just enter the organism name and AI will automatically fill in all the biological information for you!
          </p>
          <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
            <input
              type="text"
              value={aiOrganismName}
              onChange={(e) => setAiOrganismName(e.target.value)}
              placeholder="e.g., African Elephant, Tiger, Honeybee..."
              className={`flex-1 px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-sm ${isDark ? 'bg-gray-700 border-2 border-purple-600 text-white focus:ring-2 focus:ring-purple-500' : 'border-2 border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'}`}
              disabled={aiLoading}
            />
            <button
              type="button"
              onClick={handleAiComplete}
              disabled={aiLoading || !aiOrganismName.trim()}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 justify-center text-sm"
            >
              {aiLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span className="hidden sm:inline">Loading...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sparkles"></i>
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
          {aiLoading && (
            <div className="mt-4 text-center">
              <p className={`font-semibold animate-pulse text-sm sm:text-base ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>✨ AI is analyzing the organism...</p>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>This may take a few seconds</p>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Common Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className={`w-full px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-sm ${isDark ? 'bg-gray-700 border-2 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500' : 'border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}`}
              placeholder="e.g., African Elephant"
            />
          </div>
          
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Scientific Name *
            </label>
            <input
              type="text"
              name="scientific_name"
              value={formData.scientific_name}
              onChange={handleInputChange}
              required
              className={`w-full px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-sm ${isDark ? 'bg-gray-700 border-2 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500' : 'border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}`}
              placeholder="e.g., Loxodonta africana"
            />
          </div>
        </div>

        {/* Classification */}
        <div>
          <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>🔬 Taxonomic Classification</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'].map((field) => (
              <div key={field}>
                <label className={`block text-xs font-medium mb-1 capitalize ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                  {field}
                </label>
                <input
                  type="text"
                  name={`classification.${field}`}
                  value={formData.classification[field]}
                  onChange={handleInputChange}
                  className={`w-full px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm focus:outline-none transition-all ${isDark ? 'bg-gray-700 border border-gray-600 text-white focus:border-purple-500' : 'border border-gray-300 focus:ring-2 focus:ring-purple-500'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Description Fields */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              🏗️ Morphology (Physical Structure) *
            </label>
            <textarea
              name="morphology"
              value={formData.morphology}
              onChange={handleInputChange}
              required
              rows="4"
              className={`w-full px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-xs sm:text-sm ${isDark ? 'bg-gray-700 border-2 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500' : 'border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}`}
              placeholder="Describe the physical characteristics, size, shape, structure..."
            />
          </div>

          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              ⚡ Physiology (Biological Functions) *
            </label>
            <textarea
              name="physiology"
              value={formData.physiology}
              onChange={handleInputChange}
              required
              rows="4"
              className={`w-full px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-xs sm:text-sm ${isDark ? 'bg-gray-700 border-2 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500' : 'border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}`}
              placeholder="Describe biological processes, metabolism, reproduction, behavior..."
            />
          </div>

          <div>
            <label className={`block text-xs sm:text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              📝 General Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className={`w-full px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-xs sm:text-sm ${isDark ? 'bg-gray-700 border-2 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500' : 'border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500'}`}
              placeholder="Additional information, conservation status, interesting facts..."
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className={`block text-xs sm:text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            📸 Images
          </label>
          
          <div className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded-lg ${isDark ? 'bg-gray-700 border border-gray-600' : 'border border-gray-300'}`}>
            <div className="flex gap-2 mb-3 flex-col sm:flex-row">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL..."
                className={`flex-1 px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-xs sm:text-sm ${isDark ? 'bg-gray-600 border border-gray-500 text-white' : 'border border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => {
                  if (imageUrl.trim()) {
                    setFormData(prev => ({
                      ...prev,
                      images: [...prev.images, imageUrl]
                    }));
                    setImageUrl('');
                  }
                }}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm"
              >
                Add URL
              </button>
            </div>
            <div className={`flex flex-col sm:flex-row gap-2 items-center`}>
              <div className={`flex-1 text-center text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>or</div>
              <div className={`flex-1 flex gap-2`}>
                <input
                  type="text"
                  value={aiImageOrganism}
                  onChange={(e) => setAiImageOrganism(e.target.value)}
                  placeholder="Enter organism name for AI images..."
                  className={`flex-1 px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-xs sm:text-sm ${isDark ? 'bg-gray-600 border border-gray-500 text-white' : 'border border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={handleAiGenerateImages}
                  disabled={aiImageLoading}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all text-white ${
                    aiImageLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {aiImageLoading ? '🔄 Generating...' : '🤖 AI Images'}
                </button>
              </div>
            </div>
          </div>
          
          <div
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
              dragActive 
                ? (isDark ? 'border-purple-500 bg-purple-900 bg-opacity-30' : 'border-purple-500 bg-purple-50') 
                : (isDark ? 'border-gray-600' : 'border-gray-300')
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <div className="text-3xl sm:text-4xl">📁</div>
              <div>
                <label className={`cursor-pointer font-medium text-xs sm:text-sm ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}>
                  Click to upload images
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(Array.from(e.target.files))}
                    className="hidden"
                  />
                </label>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>or drag and drop</p>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>PNG, JPG, GIF up to 10MB each</p>
            </div>
          </div>

          {/* Image Preview */}
          {formData.images.length > 0 && (
            <div className="mt-4">
              <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                📸 {formData.images.length} image{formData.images.length !== 1 ? 's' : ''} selected
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className={`w-full h-20 sm:h-24 rounded-lg overflow-hidden border-2 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}>
                      <img
                        src={image}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EImage not available%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 sm:pt-6">
          <button
            type="submit"
            disabled={loading}
            className={`w-full sm:w-auto px-6 sm:px-8 py-3 rounded-lg font-semibold text-white transition-all text-sm sm:text-base ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? 'Adding Organism...' : '✅ Add Organism'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Suggestion Modal Component - Allow public users to suggest organisms
const SuggestionModal = ({ isDark, onClose, token }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    organism_name: '',
    description: '',
    educational_level: ''
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const educationalLevels = [
    { value: '11th', label: '11th Standard' },
    { value: '12th', label: '12th Standard' },
    { value: 'B.Sc 1st Year', label: 'B.Sc 1st Year' },
    { value: 'B.Sc 2nd Year', label: 'B.Sc 2nd Year' },
    { value: 'B.Sc 3rd Year', label: 'B.Sc 3rd Year' },
    { value: 'B.Sc 4th Year', label: 'B.Sc 4th Year' },
    { value: 'BCS', label: 'BCS (Computer Science)' },
    { value: 'BCA', label: 'BCA (Computer Applications)' },
    { value: 'B.Voc', label: 'B.Voc (Vocational)' },
    { value: 'M.Sc', label: 'M.Sc (Masters)' },
    { value: 'PhD', label: 'PhD / Research' },
    { value: 'Teacher', label: ' Teacher / Educator' },
    { value: 'Professional', label: 'Professional' },
    { value: 'Other', label: 'Other' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMessage(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.user_name.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    
    if (!formData.organism_name.trim()) {
      setErrorMessage('Please enter the organism name');
      return;
    }
    
    if (!formData.educational_level || !formData.educational_level.trim()) {
      setErrorMessage('Please select your class/standard');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      console.log('📤 Submitting suggestion with data:', formData);
      const response = await axios.post(`${API}/suggestions`, formData);
      
      if (response.status === 201 || response.status === 200) {
        const successMsg = `Thank you ${formData.user_name}! Suggestion submitted!`;
        setSuccessMessage(`✅ ${successMsg}`);
        setShowSuccess(true);
        showToast(`🎉 ${successMsg}`, 'success', 3000);
        setFormData({ user_name: '', organism_name: '', description: '', educational_level: '' });
        
        // Auto-close after 4 seconds
        setTimeout(() => {
          onClose();
        }, 4000);
      }
    } catch (error) {
      console.error('❌ Submission Error:', error);
      let errMsg = 'An error occurred. Please try again.';
      
      if (error.response?.data?.detail) {
        errMsg = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else if (error.message) {
        errMsg = error.message;
      } else if (error.response?.data) {
        errMsg = typeof error.response.data === 'string' 
          ? error.response.data 
          : JSON.stringify(error.response.data);
      }
      
      setErrorMessage('❌ Error: ' + errMsg);
      showToast('❌ ' + errMsg, 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto`}>
      <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-xl p-4 sm:p-8 w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl my-auto border-t-4 ${isDark ? 'border-green-600' : 'border-green-500'}`}>
        <div className="flex justify-between items-start gap-3 mb-5 sm:mb-8">
          <div>
            <h3 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              🦁 Suggest an Organism
            </h3>
            <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Help us discover new species for our museum!
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-2xl sm:text-3xl transition-all ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-600 hover:text-red-600'}`}
          >
            ✕
          </button>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className={`mb-6 p-4 sm:p-6 rounded-lg border-2 ${isDark ? 'bg-green-900 border-green-600 text-green-100' : 'bg-green-50 border-green-300 text-green-800'}`}>
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="text-2xl sm:text-3xl">🎉</span>
              <div>
                <h4 className="font-bold text-sm sm:text-base mb-1">Suggestion Submitted Successfully!</h4>
                <p className="text-xs sm:text-sm leading-relaxed">
                  {successMessage}
                </p>
                <p className={`text-xs mt-2 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                  Our team will review and verify your suggestion shortly. Thank you for contributing!
                </p>
              </div>
            </div>
          </div>
        )}

        {!showSuccess && (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Error Message */}
            {errorMessage && (
              <div className={`p-3 sm:p-4 rounded-lg border-2 ${isDark ? 'bg-red-900 border-red-600 text-red-100' : 'bg-red-50 border-red-300 text-red-800'}`}>
                <div className="flex items-start gap-2">
                  <span>⚠️</span>
                  <p className="text-xs sm:text-sm font-medium">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Your Name Field */}
            <div>
              <label className={`block text-sm sm:text-base font-semibold mb-2 sm:mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                👤 Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="user_name"
                value={formData.user_name}
                onChange={handleChange}
                placeholder="e.g., John Doe"
                maxLength="100"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30'
                } focus:outline-none`}
                required
              />
            </div>

            {/* Organism Name Field */}
            <div>
              <label className={`block text-sm sm:text-base font-semibold mb-2 sm:mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                🔬 Organism/Animal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="organism_name"
                value={formData.organism_name}
                onChange={handleChange}
                placeholder="e.g., Bengal Tiger, Blue Whale, Red Panda"
                maxLength="150"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30'
                } focus:outline-none`}
                required
              />
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {formData.organism_name.length}/150 characters
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label className={`block text-sm sm:text-base font-semibold mb-2 sm:mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                📝 Why This Organism? (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Tell us interesting facts about this organism, where it's found, why it should be in our museum..."
                rows="4"
                maxLength="500"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all resize-none text-sm sm:text-base ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30'
                } focus:outline-none`}
              />
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Educational Level Field */}
            <div>
              <label className={`block text-sm sm:text-base font-semibold mb-2 sm:mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                🎓 Your Class/Standard <span className="text-red-500">*</span>
              </label>
              <select
                name="educational_level"
                value={formData.educational_level}
                onChange={handleChange}
                required
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all text-sm sm:text-base ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30' 
                    : 'bg-white border-gray-300 text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-30'
                } focus:outline-none`}
              >
                <option value="">-- Select your class/standard --</option>
                {educationalLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Box */}
            <div className={`p-3 sm:p-4 rounded-lg ${isDark ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-800'}`}>
              <p className="text-xs sm:text-sm flex items-start gap-2">
                <span>ℹ️</span>
                <span>Our Intelligence will verify that your suggestion is a real organism. Make sure you suggest authentic species!</span>
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 order-2 sm:order-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed active:bg-green-800 text-white px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span>⏳</span> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>📤</span> Submit Suggestion
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={`flex-1 order-1 sm:order-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white disabled:bg-gray-800 disabled:cursor-not-allowed' 
                    : 'bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-800 disabled:bg-gray-200 disabled:cursor-not-allowed'
                }`}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Print Organism Modal Component - Enhanced UI with QR Code and Print Preview
const PrintOrganismModal = ({ organism, isDark, onClose }) => {
  const printRef = React.useRef();

  const handlePrint = () => {
    const istDate = formatDateIST(new Date());
    const printWindow = window.open('', '', 'height=500,width=500');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print ${organism.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 15px;
              background-color: #f5f5f5;
            }
            .print-container {
              background-color: white;
              padding: 30px 25px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 350px;
              width: 100%;
            }
            h1 {
              margin: 0 0 8px 0;
              font-size: 24px;
              color: #1a1a1a;
              word-wrap: break-word;
            }
            .scientific-name {
              font-style: italic;
              color: #555;
              margin-bottom: 25px;
              font-size: 14px;
              word-wrap: break-word;
            }
            .qr-code {
              margin: 25px 0;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .qr-code canvas {
              border: 2px solid #ddd;
              padding: 8px;
              max-width: 100%;
              height: auto;
            }
            .footer {
              margin-top: 20px;
              font-size: 11px;
              color: #888;
              border-top: 1px solid #eee;
              padding-top: 12px;
            }
            .footer p {
              margin: 3px 0;
            }
            @media print {
              body {
                background-color: white;
                padding: 0;
              }
              .print-container {
                box-shadow: none;
                padding: 20px 15px;
                max-width: 100%;
              }
              h1 {
                font-size: 20px;
              }
            }
            @media (max-width: 480px) {
              .print-container {
                padding: 20px 15px;
              }
              h1 {
                font-size: 20px;
              }
              .scientific-name {
                font-size: 13px;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <h1>${organism.name}</h1>
            <div class="scientific-name">${organism.scientific_name}</div>
            <div class="qr-code" id="qr-placeholder"></div>
            <div class="footer">
              <p>BioMuseum Collection</p>
              <p>${istDate}</p>
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
          <script>
            new QRCode(document.getElementById("qr-placeholder"), {
              text: "${window.location.origin}${window.location.pathname}?organism=${organism.id}",
              width: 180,
              height: 180,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H
            });
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto`}>
      <div className={`${isDark ? 'bg-gray-900' : 'bg-white'} rounded-lg p-5 sm:p-8 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl my-auto`}>
        <h3 className={`text-xl sm:text-2xl font-bold mb-4 sm:mb-6 break-words ${isDark ? 'text-white' : 'text-gray-800'}`}>
          🖨️ Print Card
        </h3>
        
        <div className={`mb-5 sm:mb-6 p-3 sm:p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <p className={`text-xs sm:text-sm mb-2 sm:mb-3 break-words ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <span className="font-semibold">Name:</span>
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            {organism.name}
          </p>
          <p className={`text-xs sm:text-sm italic mb-4 sm:mb-5 break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
            <span className="font-semibold">Scientific:</span>
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            {organism.scientific_name}
          </p>
          
          <div className={`flex justify-center py-3 sm:py-4 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded overflow-hidden`}>
            <QRCodeSVG 
              value={`${window.location.origin}${window.location.pathname}?organism=${organism.id}`} 
              size={Math.min(140, window.innerWidth - 80)}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base"
          >
            🖨️ <span className="hidden xs:inline">Print</span>
          </button>
          <button
            onClick={onClose}
            className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
              isDark 
                ? 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-800'
            }`}
          >
            <span className="hidden sm:inline">Close</span>
            <span className="sm:hidden">✕</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Users History Tab Component
const UsersHistoryTab = ({ token, isDark }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSuggestions();
    
    // Auto-refresh suggestions every 5 seconds to show new submissions
    const interval = setInterval(() => {
      fetchSuggestions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSuggestions = async () => {
    try {
      console.log('📡 Fetching suggestions from:', `${API}/admin/suggestions`);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(`${API}/admin/suggestions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Response received:', response.data);
      console.log('📊 Total suggestions:', response.data?.length || 0);
      
      // Sort by date descending (newest first)
      const sorted = response.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setSuggestions(sorted);
    } catch (error) {
      console.error('❌ Error fetching suggestions:', error);
      console.error('📍 Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      setSuggestions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchSuggestions();
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      // Convert to India timezone (UTC+5:30)
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800',
      approved: isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800',
      rejected: isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const handleDeleteUser = async (suggestionId) => {
    if (!window.confirm('Are you sure you want to remove this user suggestion?')) {
      return;
    }

    setDeletingId(suggestionId);
    try {
      await axios.delete(
        `${API}/admin/suggestions/${suggestionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      alert('✅ User suggestion removed successfully!');
    } catch (error) {
      alert('Error removing suggestion: ' + (error.response?.data?.detail || error.message));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-col sm:flex-row">
        <div className="flex-1">
          <h2 className={`text-2xl sm:text-3xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>👥 Users Suggestion History</h2>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            📝 All user suggestions appear here automatically when submitted, regardless of approval status. Use the ✕ button to remove any user from history.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm flex items-center gap-2 whitespace-nowrap ${
            refreshing 
              ? 'bg-gray-500 cursor-not-allowed text-white' 
              : isDark 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          <i className={`fas fa-sync ${refreshing ? 'fa-spin' : ''}`}></i>
          <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
      
      {loading ? (
        <div className={`text-center py-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-lg">⏳ Loading suggestions...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>📭 No suggestions yet</p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Suggestions from users will appear here automatically when submitted.</p>
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className="w-full">
            <thead>
              <tr className={`${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <th className={`px-4 sm:px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>User Name</th>
                <th className={`px-4 sm:px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class/Standard</th>
                <th className={`px-4 sm:px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Organism</th>
                <th className={`px-4 sm:px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</th>
                <th className={`px-4 sm:px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</th>
                <th className={`px-4 sm:px-6 py-4 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
                <th className={`px-4 sm:px-6 py-4 text-center text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Remove</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion, index) => (
                <tr key={suggestion.id} className={`border-t ${isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}>
                  <td className={`px-4 sm:px-6 py-4 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {suggestion.user_name}
                  </td>
                  <td className={`px-4 sm:px-6 py-4 text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    {suggestion.educational_level || '—'}
                  </td>
                  <td className={`px-4 sm:px-6 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="font-semibold">🦁 {capitalizeOrganismName(suggestion.organism_name)}</span>
                  </td>
                  <td className={`px-4 sm:px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} max-w-xs truncate`}>
                    {suggestion.description || '—'}
                  </td>
                  <td className={`px-4 sm:px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} whitespace-nowrap`}>
                    {formatDate(suggestion.created_at)}
                  </td>
                  <td className={`px-4 sm:px-6 py-4 text-sm`}>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(suggestion.status)}`}>
                      {suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}
                    </span>
                  </td>
                  <td className={`px-4 sm:px-6 py-4 text-center`}>
                    <button
                      onClick={() => handleDeleteUser(suggestion.id)}
                      disabled={deletingId === suggestion.id}
                      className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-500 text-white transition-colors shadow-md hover:shadow-lg"
                      title="Remove this user suggestion from history"
                      aria-label="Delete suggestion"
                    >
                      {deletingId === suggestion.id ? (
                        <i className="fas fa-spinner fa-spin text-sm"></i>
                      ) : (
                        <span className="text-lg sm:text-xl font-bold">×</span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Statistics Section */}
      {suggestions.length > 0 && (
        <div className="mt-8">
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>📊 Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>📝 Total</p>
              <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{suggestions.length}</p>
            </div>
            <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-green-50'}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>✅ Approved</p>
              <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                {suggestions.filter(s => s.status === 'approved').length}
              </p>
            </div>
            <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-yellow-50'}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>⏳ Pending</p>
              <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                {suggestions.filter(s => s.status === 'pending').length}
              </p>
            </div>
            <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-red-50'}`}>
              <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>❌ Rejected</p>
              <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {suggestions.filter(s => s.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Manage Organisms Component
const ManageOrganisms = ({ organisms, token, isDark, onUpdate }) => {
  const [editingOrganism, setEditingOrganism] = useState(null);
  const [printOrganism, setPrintOrganism] = useState(null);

  const handleDelete = async (organismId, organismName) => {
    if (window.confirm(`Are you sure you want to delete "${organismName}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`${API}/admin/organisms/${organismId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast(`🗑️ "${organismName}" deleted successfully!`, 'success', 3000);
        onUpdate();
      } catch (error) {
        const errMsg = error.response?.data?.detail || error.message;
        showToast('❌ Error: ' + errMsg, 'error', 3000);
      }
    }
  };

  if (editingOrganism) {
    return (
      <EditOrganismForm
        organism={editingOrganism}
        token={token}
        onSuccess={() => {
          setEditingOrganism(null);
          onUpdate();
        }}
        onCancel={() => setEditingOrganism(null)}
      />
    );
  }

  return (
    <div>
      <h2 className={`text-2xl sm:text-3xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>📝 Manage Organisms</h2>
      
      <div className="space-y-3 sm:space-y-4">
        {organisms.map((organism) => (
          <div key={organism.id} className={`rounded-lg p-3 sm:p-6 transition-all ${isDark ? 'bg-gray-800 border border-gray-700 hover:border-purple-500' : 'bg-white border border-gray-200 hover:shadow-lg'}`}>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <div className="flex items-center gap-2 sm:gap-4 mb-2 flex-wrap">
                  <h3 className={`text-base sm:text-xl font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{organism.name}</h3>
                  <span className={`text-xs sm:text-sm px-2 py-1 rounded whitespace-nowrap ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                    {organism.classification?.kingdom || 'Unknown'}
                  </span>
                </div>
                <p className={`text-xs sm:text-sm italic truncate mb-1 sm:mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{organism.scientific_name}</p>
                <p className={`text-xs sm:text-sm line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{organism.description}</p>
                
                {organism.images && organism.images.length > 0 && (
                  <div className="mt-2 sm:mt-3 flex gap-1 sm:gap-2 flex-wrap">
                    {organism.images.slice(0, 3).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${organism.name} ${index + 1}`}
                        className={`w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
                      />
                    ))}
                    {organism.images.length > 3 && (
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded border flex items-center justify-center text-xs sm:text-sm ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}>
                        +{organism.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-1.5 sm:gap-2 ml-0 sm:ml-4 w-full sm:w-auto flex-wrap">
                <button
                  onClick={() => setEditingOrganism(organism)}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2.5 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[44px] sm:min-h-auto flex items-center justify-center"
                >
                  <span className="text-lg sm:text-base">✏️</span>
                  <span className="hidden sm:inline ml-1">Edit</span>
                </button>
                <button
                  onClick={() => setPrintOrganism(organism)}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-2.5 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[44px] sm:min-h-auto flex items-center justify-center"
                >
                  <span className="text-lg sm:text-base">🖨️</span>
                  <span className="hidden sm:inline ml-1">Print</span>
                </button>
                <button
                  onClick={() => handleDelete(organism.id, organism.name)}
                  className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-2.5 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[44px] sm:min-h-auto flex items-center justify-center"
                >
                  <span className="text-lg sm:text-base">🗑️</span>
                  <span className="hidden sm:inline ml-1">Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {organisms.length === 0 && (
          <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`text-base sm:text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No organisms found.</p>
            <p className={`text-xs sm:text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add your first organism using the "Add Organism" tab.</p>
          </div>
        )}
      </div>
      
      {printOrganism && (
        <PrintOrganismModal 
          organism={printOrganism} 
          isDark={isDark} 
          onClose={() => setPrintOrganism(null)} 
        />
      )}
    </div>
  );
};

// Edit Organism Form Component
const EditOrganismForm = ({ organism, token, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: organism.name || '',
    scientific_name: organism.scientific_name || '',
    classification: organism.classification || {
      kingdom: '', phylum: '', class: '', order: '', family: '', genus: '', species: ''
    },
    morphology: organism.morphology || '',
    physiology: organism.physiology || '',
    description: organism.description || '',
    images: organism.images || []
  });
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('classification.')) {
      const classField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        classification: {
          ...prev.classification,
          [classField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = async (files) => {
    const newImages = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const base64 = await convertToBase64(file);
        newImages.push(base64);
      }
    }
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/admin/organisms/${organism.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showToast('✏️ Organism updated successfully!', 'success', 3000);
      onSuccess();
    } catch (error) {
      const errMsg = error.response?.data?.detail || error.message;
      showToast('❌ Error: ' + errMsg, 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">✏️ Edit Organism: {organism.name}</h2>
        <button
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          Cancel
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Common Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scientific Name *
            </label>
            <input
              type="text"
              name="scientific_name"
              value={formData.scientific_name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Classification */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">🔬 Taxonomic Classification</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {field}
                </label>
                <input
                  type="text"
                  name={`classification.${field}`}
                  value={formData.classification[field] || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Description Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🏗️ Morphology *
            </label>
            <textarea
              name="morphology"
              value={formData.morphology}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ⚡ Physiology *
            </label>
            <textarea
              name="physiology"
              value={formData.physiology}
              onChange={handleInputChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📝 Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Image Management */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📸 Images
          </label>
          
          {/* Existing Images */}
          {formData.images.length > 0 && (
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`${formData.name} ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add New Images */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <label className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
              📁 Add More Images
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(Array.from(e.target.files))}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-8 py-3 rounded-lg font-semibold text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {loading ? 'Updating...' : '✅ Update Organism'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Organisms Page Component
const OrganismsPage = () => {
  const [organisms, setOrganisms] = useState([]);
  const [allOrganisms, setAllOrganisms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKingdom, setSelectedKingdom] = useState('');
  const [selectedPhylum, setSelectedPhylum] = useState('');
  const navigate = useNavigate();
  const { isDark, toggleTheme } = React.useContext(ThemeContext);

  useEffect(() => {
    fetchOrganisms();
  }, []);

  const fetchOrganisms = async () => {
    try {
      const response = await axios.get(`${API}/organisms`);
      setAllOrganisms(response.data);
      setOrganisms(response.data);
    } catch (error) {
      console.error('Error fetching organisms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKingdomChange = (e) => {
    const kingdom = e.target.value;
    setSelectedKingdom(kingdom);
    filterOrganisms(kingdom, selectedPhylum);
  };

  const handlePhylumChange = (e) => {
    const phylum = e.target.value;
    setSelectedPhylum(phylum);
    filterOrganisms(selectedKingdom, phylum);
  };

  const filterOrganisms = (kingdom, phylum) => {
    let filtered = allOrganisms;
    
    if (kingdom) {
      filtered = filtered.filter(org => org.classification?.kingdom === kingdom);
    }
    
    if (phylum) {
      filtered = filtered.filter(org => org.classification?.phylum === phylum);
    }
    
    setOrganisms(filtered);
  };

  const getUniqueKingdoms = () => {
    return [...new Set(allOrganisms.map(org => org.classification?.kingdom).filter(Boolean))];
  };

  const getUniquePhyla = () => {
    return [...new Set(allOrganisms.map(org => org.classification?.phylum).filter(Boolean))];
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center px-4">
          <div className="text-6xl mb-6 animate-bounce">⏳</div>
          <div className="text-lg sm:text-2xl font-bold text-gray-800">Loading organisms...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Navbar */}
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-green-600 to-green-700 border-green-800'} shadow-lg border-b-4 sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold text-white">🌿 BioMuseum</h1>
          <div className="flex gap-2 sm:gap-3 items-center">
            <button
              onClick={toggleTheme}
              className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-white hover:bg-gray-100 text-gray-800'} px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all`}
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button onClick={() => window.location.href = '/'} className={`${isDark ? 'bg-gray-700 hover:bg-gray-600 text-green-400' : 'bg-white hover:bg-gray-100 text-green-700'} px-3 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all flex items-center gap-1 sm:gap-2 shadow-md`}>
              <i className="fas fa-arrow-left"></i><span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full py-6 sm:py-8 px-3 sm:px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center text-gray-800">
          <i className="fas fa-binoculars mr-2 text-green-600"></i>Explore Organisms
        </h2>

        {/* Filter Section */}
        <div className={`mb-6 sm:mb-8 p-4 sm:p-6 rounded-xl shadow-md border-l-4 border-green-600 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {/* Kingdom Filter */}
            <div>
              <label className={`block font-semibold mb-2 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <i className="fas fa-filter mr-2 text-green-600"></i>Filter by Kingdom
              </label>
              <select
                value={selectedKingdom}
                onChange={handleKingdomChange}
                className={`w-full px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-sm sm:text-base border-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-900' : 'border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'}`}
              >
                <option value="">All Kingdoms</option>
                {getUniqueKingdoms().map(kingdom => (
                  <option key={kingdom} value={kingdom}>{kingdom}</option>
                ))}
              </select>
            </div>

            {/* Phylum Filter */}
            <div>
              <label className={`block font-semibold mb-2 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <i className="fas fa-filter mr-2 text-green-600"></i>Filter by Phylum
              </label>
              <select
                value={selectedPhylum}
                onChange={handlePhylumChange}
                className={`w-full px-3 sm:px-4 py-2 rounded-lg focus:outline-none transition-all text-sm sm:text-base border-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-900' : 'border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'}`}
              >
                <option value="">All Phyla</option>
                {getUniquePhyla().map(phylum => (
                  <option key={phylum} value={phylum}>{phylum}</option>
                ))}
              </select>
            </div>
          </div>
          <p className={`text-xs sm:text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Showing {organisms.length} organism{organisms.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Organisms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {organisms.map((organism) => (
            <div
              key={organism.id}
              onClick={() => navigate(`/organism/${organism.id}`)}
              className={`rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 duration-300 overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700 hover:border-green-500' : 'bg-white border-gray-200 hover:border-green-300'}`}
            >
              <div className={`flex items-center justify-center overflow-hidden h-40 sm:h-48 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {organism.images && organism.images[0] ? (
                  <img
                    src={organism.images[0]}
                    alt={organism.name}
                    className="w-full h-full object-cover hover:brightness-110 transition-all"
                  />
                ) : (
                  <div className="text-3xl sm:text-4xl"><i className="fas fa-leaf text-green-600"></i></div>
                )}
              </div>
              <div className={`p-3 sm:p-4 text-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <h3 className={`text-base sm:text-lg font-bold mb-1 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>{organism.name}</h3>
                <p className={`text-xs sm:text-sm italic mb-2 sm:mb-3 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{organism.scientific_name}</p>
                {organism.classification && (
                  <div className="mt-2 sm:mt-3">
                    <span className={`inline-block text-xs px-2 sm:px-3 py-1 rounded-full font-medium ${isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                      {organism.classification.kingdom || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {organisms.length === 0 && (
          <div className={`text-center py-12 sm:py-16 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="text-4xl mb-4">🔍</div>
            <p className={`text-base sm:text-lg font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>No organisms found</p>
            <p className={`text-xs sm:text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Try adjusting your search filters.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`${isDark ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-b from-gray-900 to-gray-950 border-green-600'} text-white mt-10 sm:mt-12 border-t-4`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-green-400">🌿 BioMuseum</h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-300'}`}>
                Discover the wonders of life science through our interactive biology museum.
              </p>
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 text-green-400">Links</h4>
              <ul className={`space-y-1 sm:space-y-2 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-300'}`}>
                <li><a href="/" className="hover:text-green-400 transition-colors flex items-center justify-center sm:justify-start gap-2"><i className="fas fa-home"></i><span>Home</span></a></li>
              </ul>
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 text-green-400">Contact</h4>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-300'}`}><i className="fas fa-envelope mr-2"></i><a href="mailto:sarthaknk07@outlook.com" className="hover:text-green-400">sarthaknk07@outlook.com</a></p>
            </div>
          </div>
          <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-700'} mt-6 sm:mt-8 pt-4 sm:pt-6 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'} text-xs sm:text-sm`}>
            <p>© Made with 💚 @ Chh. Sambhaji Nagar</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Biotube Wrapper Component to access theme context
const BiotubeWrapper = () => {
  const { isDark } = React.useContext(ThemeContext);
  return <BiotubeHomepage isDark={isDark} />;
};

// Biotube Video Wrapper Component to access theme context
const BiotubeVideoWrapper = () => {
  const { isDark } = React.useContext(ThemeContext);
  return <BiotubeVideoPage isDark={isDark} />;
};

// About Us Wrapper Component to access theme context
const AboutUsWrapper = () => {
  const { isDark } = React.useContext(ThemeContext);
  return <AboutUs isDark={isDark} />;
};

// Blog Wrapper Component to access theme context
const BlogWrapper = () => {
  const { isDark } = React.useContext(ThemeContext);
  return <BlogHomepage isDark={isDark} />;
};

// Blog Detail Wrapper Component to access theme context
const BlogDetailWrapper = () => {
  const { isDark } = React.useContext(ThemeContext);
  return <BlogDetailPage isDark={isDark} />;
};

function App() {
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <ThemeProvider>
          <SiteProvider>
            <AdminProvider>
              <HelmetProvider>
                <div className="App">
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Homepage />} />
                      <Route path="/organisms" element={<OrganismsPage />} />
                      <Route path="/scanner" element={<QRScanner />} />
                      <Route path="/organism/:id" element={<OrganismDetail />} />
                      <Route path="/admin" element={<AdminPanel />} />
                      <Route path="/biotube" element={<BiotubeWrapper />} />
                      <Route path="/biotube/watch/:videoId" element={<BiotubeVideoWrapper />} />
                      <Route path="/about" element={<AboutUsWrapper />} />
                      <Route path="/blogs" element={<BlogWrapper />} />
                      <Route path="/blog/:blogId" element={<BlogDetailWrapper />} />
                    </Routes>
                    <BioMuseumAIChatbot />
                  </BrowserRouter>
                </div>
              </HelmetProvider>
            </AdminProvider>
          </SiteProvider>
        </ThemeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;