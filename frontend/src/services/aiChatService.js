import axios from 'axios';

const BACKEND_URL = (() => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://biomuseum.onrender.com';
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return 'http://localhost:8000';
})();

const API = `${BACKEND_URL}/api`;

// Simple cache for Q&A
const responseCache = new Map();

// Track last request time for throttling
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

export const askBiologyQuestion = async (question, context = null) => {
  try {
    const cleanQuestion = question.trim();
    
    // Check cache first
    if (responseCache.has(cleanQuestion)) {
      console.log('📦 Using cached response');
      return {
        success: true,
        data: responseCache.get(cleanQuestion),
        cached: true
      };
    }
    
    // Throttling: prevent rapid successive requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      return {
        success: false,
        error: `⏳ Please wait ${Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000)}s before next question (rate limited)`
      };
    }
    
    lastRequestTime = now;
    
    const response = await axios.post(`${API}/ai/ask`, {
      question: cleanQuestion,
      context: context
    }, {
      timeout: 30000
    });
    
    // Cache the successful response
    responseCache.set(cleanQuestion, response.data);
    
    return {
      success: true,
      data: response.data,
      cached: false
    };
  } catch (error) {
    console.error('Error asking question:', error);
    
    const errorMsg = error.response?.data?.detail || error.message || 'Failed to get response';
    
    // Check for rate limit errors
    if (error.response?.status === 429 || errorMsg.includes('quota')) {
      return {
        success: false,
        error: '⏸️ API quota limit reached. Please wait a moment and try again. The free tier has daily limits.',
        isQuotaError: true
      };
    }
    
    return {
      success: false,
      error: errorMsg
    };
  }
};

export const clearCache = () => {
  responseCache.clear();
};

export default {
  askBiologyQuestion,
  clearCache
};
