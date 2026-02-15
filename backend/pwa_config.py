"""
Progressive Web App (PWA) Configuration
Enables mobile app-like experience and offline access
"""

import json
from typing import Dict

class PWAConfig:
    """PWA configuration and utilities"""
    
    # Web App Manifest for PWA
    MANIFEST = {
        "name": "BioMuseum - Biology Education Platform",
        "short_name": "BioMuseum",
        "description": "Interactive biology education platform with organism database and educational videos",
        "start_url": "/",
        "scope": "/",
        "display": "standalone",
        "orientation": "portrait-primary",
        "theme_color": "#2d3748",
        "background_color": "#ffffff",
        "categories": ["education", "biology"],
        "screenshots": [
            {
                "src": "/screenshots/screenshot-540x720.png",
                "sizes": "540x720",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/screenshots/screenshot-1080x1440.png",
                "sizes": "1080x1440",
                "type": "image/png",
                "purpose": "any"
            }
        ],
        "icons": [
            {
                "src": "/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/icons/icon-maskable-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": "/icons/icon-maskable-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ],
        "shortcuts": [
            {
                "name": "Search Organisms",
                "short_name": "Search",
                "description": "Search the organism database",
                "url": "/search?utm_source=pwa_shortcut",
                "icons": [{"src": "/icons/search-icon.png", "sizes": "192x192"}]
            },
            {
                "name": "Suggest Organism",
                "short_name": "Suggest",
                "description": "Contribute new organisms",
                "url": "/suggest?utm_source=pwa_shortcut",
                "icons": [{"src": "/icons/suggest-icon.png", "sizes": "192x192"}]
            },
            {
                "name": "BioTube Videos",
                "short_name": "Videos",
                "description": "Watch educational videos",
                "url": "/biotube?utm_source=pwa_shortcut",
                "icons": [{"src": "/icons/video-icon.png", "sizes": "192x192"}]
            }
        ]
    }
    
    @staticmethod
    def get_manifest() -> Dict:
        """Get PWA manifest"""
        return PWAConfig.MANIFEST
    
    @staticmethod
    def get_service_worker_code() -> str:
        """Get service worker code for offline support"""
        return '''
// Service Worker for BioMuseum PWA
const CACHE_NAME = 'biomuseum-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/offline.html'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache install error:', error);
      })
  );
  self.skipWaiting();
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            // Clone response
            const responseClone = response.clone();
            
            // Cache successful requests
            if (response.status === 200) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            return caches.match('/offline.html');
          });
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background Sync for offline submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-suggestions') {
    event.waitUntil(
      // Sync pending suggestions when back online
      Promise.resolve()
    );
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'biomuseum-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'BioMuseum', options)
  );
});
'''
    
    @staticmethod
    def get_offline_page() -> str:
        """Get offline fallback HTML page"""
        return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Offline - BioMuseum</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
        }
        h1 { color: #2d3748; margin-bottom: 1rem; font-size: 2rem; }
        p { color: #718096; margin-bottom: 1.5rem; line-height: 1.6; }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            margin-top: 1rem;
        }
        button:hover { background: #764ba2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>BioMuseum requires an internet connection. Please check your network and try again.</p>
        <p>Previously viewed organisms will be available shortly.</p>
        <button onclick="location.reload()">Try Again</button>
    </div>
    <script>
        // Listen for online event
        window.addEventListener('online', () => {
            location.reload();
        });
    </script>
</body>
</html>
'''


class OfflineData:
    """Handle offline data storage"""
    
    @staticmethod
    def get_offline_storage_schema() -> Dict:
        """IndexedDB schema for offline storage"""
        return {
            "database": "BioMuseum",
            "version": 1,
            "stores": [
                {
                    "name": "organisms",
                    "keyPath": "id",
                    "indexes": [
                        {"name": "organism_name", "unique": False},
                        {"name": "kingdom", "unique": False}
                    ]
                },
                {
                    "name": "videos",
                    "keyPath": "id",
                    "indexes": [
                        {"name": "video_title", "unique": False}
                    ]
                },
                {
                    "name": "pending_submissions",
                    "keyPath": "id",
                    "indexes": [
                        {"name": "timestamp", "unique": False}
                    ]
                },
                {
                    "name": "search_history",
                    "keyPath": "id",
                    "indexes": [
                        {"name": "search_term", "unique": False}
                    ]
                }
            ]
        }
