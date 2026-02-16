import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { SiteContext } from '../contexts/SiteContext';

const PersonalizationAdminPanel = ({ token, isDark }) => {
  const { siteSettings, updateSiteSettings } = useContext(SiteContext);
  const [formData, setFormData] = useState({
    ...siteSettings,
    primary_color: siteSettings.primary_color || '#7c3aed',
    secondary_color: siteSettings.secondary_color || '#3b82f6',
    font_url: siteSettings.font_url || '',
    font_family: siteSettings.font_family || 'Poppins'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState(siteSettings.logo_url);
  const [logoInputMode, setLogoInputMode] = useState('file'); // 'file' or 'url'

  const BACKEND_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : (process.env.REACT_APP_BACKEND_URL || 'https://sbzoomuseum.onrender.com');

  // Sync formData with siteSettings when they change
  useEffect(() => {
    if (siteSettings && Object.keys(siteSettings).length > 0) {
      console.log('🔄 Syncing formData with updated siteSettings:', siteSettings);
      setFormData({
        website_name: siteSettings.website_name || '',
        initiative_text: siteSettings.initiative_text || '',
        college_name: siteSettings.college_name || '',
        department_name: siteSettings.department_name || '',
        logo_url: siteSettings.logo_url || '',
        primary_color: siteSettings.primary_color || '#7c3aed',
        secondary_color: siteSettings.secondary_color || '#3b82f6',
        font_url: siteSettings.font_url || '',
        font_family: siteSettings.font_family || 'Poppins'
      });
      setLogoPreview(siteSettings.logo_url);
    }
  }, [siteSettings]);

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

      console.log('💾 Saving settings:', updatePayload);
      await updateSiteSettings(updatePayload, token);
      
      // Refresh settings after save
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLogoFile(null);
      setLogoUrl('');
      setMessage({ 
        text: 'Site settings updated successfully! Changes will appear immediately.', 
        type: 'success' 
      });
      
      // Refetch to ensure latest values are loaded
      setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 4000);
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to save settings';
      setMessage({ 
        text: errorMsg, 
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
              <i className="fa-solid fa-wand-magic-sparkles fa-lg text-purple-500"></i>
              Website Personalization
            </h2>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Customize your website's branding and appearance
            </p>
          </div>

          {/* Message Alert */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? `${isDark ? 'bg-green-900 border-green-700' : 'bg-green-100 border-green-400'} ${isDark ? 'text-green-300' : 'text-green-700'} border`
                : `${isDark ? 'bg-red-900 border-red-700' : 'bg-red-100 border-red-400'} ${isDark ? 'text-red-300' : 'text-red-700'} border`
            }`}>
              <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'} text-lg`}></i>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8">
            {/* Website Name Section */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fa-solid fa-globe mr-2 text-purple-500"></i>
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
                <i className="fa-solid fa-book-open mr-2 text-blue-500"></i>
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
                <i className="fa-solid fa-graduation-cap mr-2 text-green-500"></i>
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
                <i className="fa-solid fa-flask mr-2 text-orange-500"></i>
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

            {/* Primary Color */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fa-solid fa-palette mr-2 text-red-500"></i>
                Primary Color
              </label>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color || '#7c3aed'}
                    onChange={handleInputChange}
                    className={`w-full h-12 rounded-lg cursor-pointer border-2 ${
                      isDark
                        ? 'border-gray-600'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
                <input
                  type="text"
                  value={formData.primary_color || '#7c3aed'}
                  onChange={(e) => handleInputChange({ target: { name: 'primary_color', value: e.target.value } })}
                  placeholder="#7c3aed"
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-mono ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500 focus:ring-2 focus:ring-red-900'
                      : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  } focus:outline-none`}
                />
              </div>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Choose the primary color for buttons, links, and highlights across your website
              </p>
            </div>

            {/* Secondary Color */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fa-solid fa-palette mr-2 text-blue-500"></i>
                Secondary Color
              </label>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color || '#3b82f6'}
                    onChange={handleInputChange}
                    className={`w-full h-12 rounded-lg cursor-pointer border-2 ${
                      isDark
                        ? 'border-gray-600'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
                <input
                  type="text"
                  value={formData.secondary_color || '#3b82f6'}
                  onChange={(e) => handleInputChange({ target: { name: 'secondary_color', value: e.target.value } })}
                  placeholder="#3b82f6"
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all font-mono ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-900'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  } focus:outline-none`}
                />
              </div>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Choose the secondary color for accents and gradients
              </p>
            </div>

            {/* Font URL (Google Fonts/CDN) */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fa-solid fa-font mr-2 text-cyan-500"></i>
                Font URL (Google Fonts or CDN)
              </label>
              <input
                type="url"
                name="font_url"
                value={formData.font_url || ''}
                onChange={handleInputChange}
                placeholder="e.g., https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-900'
                    : 'border-gray-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200'
                } focus:outline-none`}
              />
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Paste your Google Fonts embed link, e.g., <code className={`${isDark ? 'bg-gray-700' : 'bg-gray-200'} px-2 py-1 rounded`}>https://fonts.googleapis.com/css2?family=Poppins</code>
              </p>
            </div>

            {/* Font Family Name */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fa-solid fa-type mr-2 text-green-500"></i>
                Font Family Name
              </label>
              <input
                type="text"
                name="font_family"
                value={formData.font_family || ''}
                onChange={handleInputChange}
                placeholder="e.g., Poppins, Arial, Georgia"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-900'
                    : 'border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'
                } focus:outline-none`}
              />
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Enter the font family name to apply to your website (must match the font from the URL above)
              </p>
            </div>

            {/* Logo Section */}
            <div>
              <label className={`block text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fa-solid fa-image mr-2 text-indigo-500"></i>
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
                    <i className="fa-solid fa-image text-4xl mb-2"></i>
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
                  <i className="fa-solid fa-upload mr-2"></i>Upload File
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
                  <i className="fa-solid fa-link mr-2"></i>From URL
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
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i>
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...siteSettings,
                    primary_color: siteSettings.primary_color || '#7c3aed',
                    secondary_color: siteSettings.secondary_color || '#3b82f6',
                    font_url: siteSettings.font_url || '',
                    font_family: siteSettings.font_family || 'Poppins'
                  });
                  setLogoFile(null);
                  setLogoPreview(siteSettings.logo_url);
                  setLogoUrl('');
                }}
                className={`flex-1 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'} font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2`}
              >
                <i className="fa-solid fa-rotate-left"></i>
                Reset
              </button>
            </div>

            {/* Preview Section */}
            <div className={`mt-8 p-6 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-purple-50'} border-2 ${isDark ? 'border-gray-600' : 'border-purple-200'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                <i className="fa-solid fa-eye mr-2"></i>Preview
              </h3>
              <div className="space-y-3">
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
                <hr className={isDark ? 'border-gray-600' : 'border-purple-200'} />
                <div className="flex items-center gap-4">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <strong>Primary Color:</strong>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-gray-400 shadow-md"
                    style={{ backgroundColor: formData.primary_color || '#7c3aed' }}
                  ></div>
                  <span className={`font-mono text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {(formData.primary_color || '#7c3aed').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <strong>Secondary Color:</strong>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-lg border-2 border-gray-400 shadow-md"
                    style={{ backgroundColor: formData.secondary_color || '#3b82f6' }}
                  ></div>
                  <span className={`font-mono text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {(formData.secondary_color || '#3b82f6').toUpperCase()}
                  </span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Font Family:</strong> <span className={isDark ? 'text-white' : 'text-gray-800'} style={{ fontFamily: formData.font_family || 'Poppins' }}>{formData.font_family || 'Poppins'}</span>
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <strong>Font URL:</strong> <span className={`text-xs break-all ${isDark ? 'text-gray-500' : 'text-gray-700'}`}>{formData.font_url || 'Not set'}</span>
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
