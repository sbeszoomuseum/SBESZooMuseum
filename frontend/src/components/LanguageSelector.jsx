import React, { useState, useEffect } from 'react';

const LanguageSelector = ({ isDark, onLanguageChange }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isOpen, setIsOpen] = useState(false);

  const languages = {
    en: { name: 'English', icon: 'fa-globe', code: 'US' },
    es: { name: 'Español', icon: 'fa-globe', code: 'ES' },
    fr: { name: 'Français', icon: 'fa-globe', code: 'FR' },
    de: { name: 'Deutsch', icon: 'fa-globe', code: 'DE' },
    hi: { name: 'हिन्दी', icon: 'fa-globe', code: 'IN' },
    pt: { name: 'Português', icon: 'fa-globe', code: 'PT' },
    ja: { name: '日本語', icon: 'fa-globe', code: 'JP' },
    zh: { name: '中文', icon: 'fa-globe', code: 'CN' }
  };

  useEffect(() => {
    const saved = localStorage.getItem('user_language') || 'en';
    setCurrentLanguage(saved);
  }, []);

  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    localStorage.setItem('user_language', lang);
    onLanguageChange(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
          isDark
            ? 'bg-gray-800 hover:bg-gray-700 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
        }`}
      >
        <i className={`fas ${languages[currentLanguage].icon}`}></i>
        <span className="hidden sm:inline">{languages[currentLanguage].name}</span>
        <i className="fas fa-chevron-down text-xs"></i>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 rounded-lg shadow-lg z-50 min-w-48 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          {Object.entries(languages).map(([code, { name, icon }]) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition ${
                code === currentLanguage
                  ? isDark
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-900'
                  : isDark
                  ? 'hover:bg-gray-700 text-white'
                  : 'hover:bg-gray-100 text-gray-900'
              }`}
            >
              <i className={`fas ${icon}`}></i>
              <span className="font-semibold">{name}</span>
              {code === currentLanguage && <i className="fas fa-check ml-auto"></i>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
