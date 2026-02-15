import React, { useContext, useState } from 'react';
import axios from 'axios';
import { SiteContext } from '../contexts/SiteContext';

const PersonalizationAdminPanel = ({ token, isDark }) => {
  const { siteSettings, updateSiteSettings } = useContext(SiteContext);
  const [formData, setFormData] = useState(siteSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState(siteSettings.logo_url);
  const [logoInputMode, setLogoInputMode] = useState('file'); // 'file' or 'url'

  const BACKEND_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : (process.env.REACT_APP_BACKEND_URL || 'https://biomuseum.onrender.com');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUrlChange = (e) => {
    const url = e.target.value;
    setLogoUrl(url);
    if (url) {
      setLogoPreview(url);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      let updatePayload = { ...formData };
      
      // Handle logo upload from file if selected
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append('file', logoFile);
        
        try {
          const uploadResponse = await axios.post(
            `${BACKEND_URL}/api/upload`,
            logoFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
              },
              timeout: 10000,
            }
          );
          
          updatePayload.logo_url = uploadResponse.data.file_url;
        } catch (uploadError) {
          console.error('Logo upload error:', uploadError);
          // Continue without updating logo if upload fails
          delete updatePayload.logo_url;
        }
      } else if (logoUrl) {
        // Use URL directly
        updatePayload.logo_url = logoUrl;
      }

      await updateSiteSettings(updatePayload, token);
      setLogoFile(null);
      setLogoUrl('');
      setMessage({ 
        text: '✅ Site settings updated successfully!', 
        type: 'success' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to save settings';
      setMessage({ 
        text: `❌ ${errorMsg}`, 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-blue-50'} py-6 px-4`}>
      <div className="max-w-4xl mx-auto">
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-purple-200'} rounded-xl shadow-lg p-6 border`}>
          {/* Header */}
          <div className="mb-8">
            <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'} flex items-center gap-3 mb-2`}>
              <i className="fas fa-magic fa-lg text-purple-500"></i>
              Website Personalization
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Customize your website's branding and appearance
            </p>
          </div>

          {/* Message Alert */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? `${isDark ? 'bg-green-900 border-green-700' : 'bg-green-100 border-green-400'} ${isDark ? 'text-green-300' : 'text-green-700'} border`
                : `${isDark ? 'bg-red-900 border-red-700' : 'bg-red-100 border-red-400'} ${isDark ? 'text-red-300' : 'text-red-700'} border`
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8">
            {/* Website Name Section */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fas fa-globe mr-2 text-purple-500"></i>
                Website Name
              </label>
              <input
                type="text"
                name="website_name"
                value={formData.website_name}
                onChange={handleInputChange}
                placeholder="e.g., BioMuseum"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-900'
                    : 'border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                } focus:outline-none`}
              />
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                This name will appear in the navbar, footer, and throughout the site
              </p>
            </div>

            {/* Initiative Text */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fas fa-book-open mr-2 text-blue-500"></i>
                Initiative Text
              </label>
              <input
                type="text"
                name="initiative_text"
                value={formData.initiative_text}
                onChange={handleInputChange}
                placeholder="e.g., An Initiative by"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-900'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                } focus:outline-none`}
              />
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Displayed above the institution name on the homepage
              </p>
            </div>

            {/* College Name */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fas fa-university mr-2 text-green-500"></i>
                College/Institution Name
              </label>
              <input
                type="text"
                name="college_name"
                value={formData.college_name}
                onChange={handleInputChange}
                placeholder="e.g., SBES College of Science"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-900'
                    : 'border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                } focus:outline-none`}
              />
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Name of your college or institution
              </p>
            </div>

            {/* Department Name */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fas fa-flask mr-2 text-orange-500"></i>
                Department Name
              </label>
              <input
                type="text"
                name="department_name"
                value={formData.department_name}
                onChange={handleInputChange}
                placeholder="e.g., Zoology Department"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-900'
                    : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                } focus:outline-none`}
              />
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Name of your department
              </p>
            </div>

            {/* Logo Section */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fas fa-image mr-2 text-indigo-500"></i>
                Institution Logo
              </label>
              
              {/* Logo Preview */}
              <div className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center min-h-40`}>
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="max-h-40 max-w-full object-contain"
                  />
                ) : (
                  <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <i className="fas fa-image text-4xl mb-2"></i>
                    <p>No logo uploaded yet</p>
                  </div>
                )}
              </div>

              {/* Logo Input Mode Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setLogoInputMode('file');
                    setLogoUrl('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    logoInputMode === 'file'
                      ? `${isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'}`
                      : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                  }`}
                >
                  <i className="fas fa-upload mr-2"></i>Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogoInputMode('url');
                    setLogoFile(null);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                    logoInputMode === 'url'
                      ? `${isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'}`
                      : `${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                  }`}
                >
                  <i className="fas fa-link mr-2"></i>From URL
                </button>
              </div>

              {/* File Input */}
              {logoInputMode === 'file' && (
                <div>
                  <div className="mb-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className={`w-full px-4 py-2 rounded-lg border-2 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-300'
                          : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Upload a PNG or JPG image for your institution's logo. Recommended size: 200x200px or smaller
                  </p>
                </div>
              )}

              {/* URL Input */}
              {logoInputMode === 'url' && (
                <div>
                  <div className="mb-3">
                    <input
                      type="url"
                      placeholder="e.g., https://example.com/logo.png"
                      value={logoUrl}
                      onChange={handleLogoUrlChange}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900'
                          : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                      } focus:outline-none`}
                    />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Paste a direct URL to an image hosted on the internet. The image will be displayed and linked from your website
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-gray-300 dark:border-gray-600">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData(siteSettings);
                  setLogoFile(null);
                  setLogoPreview(siteSettings.logo_url);
                }}
                className={`flex-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'} font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2`}
              >
                <i className="fas fa-undo"></i>
                Reset
              </button>
            </div>

            {/* Preview Section */}
            <div className={`mt-8 p-6 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-purple-50'} border-2 ${isDark ? 'border-gray-600' : 'border-purple-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fas fa-eye mr-2"></i>Preview
              </h3>
              <div className="space-y-2">
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Website Name:</strong> <span className={isDark ? 'text-white' : 'text-gray-800'}>{formData.website_name}</span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Initiative Text:</strong> <span className={isDark ? 'text-white' : 'text-gray-800'}>{formData.initiative_text}</span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>College Name:</strong> <span className={isDark ? 'text-white' : 'text-gray-800'}>{formData.college_name}</span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Department Name:</strong> <span className={isDark ? 'text-white' : 'text-gray-800'}>{formData.department_name}</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default PersonalizationAdminPanel;
