import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const SiteContext = createContext();

export const SiteProvider = ({ children }) => {
  const [siteSettings, setSiteSettings] = useState({
    website_name: 'BioMuseum',
    initiative_text: 'An Initiative by',
    college_name: 'SBES College of Science',
    department_name: 'Zoology Department',
    logo_url: null,
    primary_color: '#7c3aed',
    secondary_color: '#3b82f6',
    font_url: '',
    font_family: 'Poppins',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BACKEND_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : (process.env.REACT_APP_BACKEND_URL || 'https://sbzoomuseum.onrender.com');

  useEffect(() => {
    fetchSiteSettings();
  }, []);

  const fetchSiteSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/site-settings`, {
        timeout: 5000,
      });
      setSiteSettings(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching site settings:', err);
      setError(err.message);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  const updateSiteSettings = async (updates, adminToken) => {
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/admin/site-settings`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          timeout: 5000,
        }
      );
      setSiteSettings(response.data);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error updating site settings:', err);
      throw err;
    }
  };

  return (
    <SiteContext.Provider value={{ siteSettings, loading, error, fetchSiteSettings, updateSiteSettings }}>
      {children}
    </SiteContext.Provider>
  );
};
