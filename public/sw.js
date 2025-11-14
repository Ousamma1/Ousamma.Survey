/**
 * Service Worker for Ousamma Survey Platform
 * Provides offline support and PWA capabilities
 */

const CACHE_NAME = 'ousamma-survey-v1';
const RUNTIME_CACHE = 'ousamma-runtime';
const SURVEY_DATA_CACHE = 'ousamma-survey-data';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/survey-sections.css',
  '/js/survey-sections.js',
  '/js/survey-distribution.js',
  '/survey-distribution.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activate worker immediately
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME &&
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== SURVEY_DATA_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

/**
 * Cache First Strategy - for static assets
 * Try cache first, fallback to network
 */
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed, returning offline page:', error);
    return getOfflinePage();
  }
}

/**
 * Network First Strategy - for API requests
 * Try network first, fallback to cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful GET requests
    if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(SURVEY_DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // For POST requests (survey submissions), store offline
    if (request.method === 'POST') {
      return handleOfflineSubmission(request);
    }

    throw error;
  }
}

/**
 * Handle offline survey submission
 * Store in IndexedDB and sync when online
 */
async function handleOfflineSubmission(request) {
  try {
    const formData = await request.clone().json();

    // Store in IndexedDB for later sync
    await storeOfflineSubmission(formData);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'Your response has been saved offline and will be submitted when you\'re back online'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[SW] Error handling offline submission:', error);
    throw error;
  }
}

/**
 * Store offline submission in IndexedDB
 */
async function storeOfflineSubmission(data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OusammaSurveyDB', 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineSubmissions')) {
        db.createObjectStore('offlineSubmissions', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['offlineSubmissions'], 'readwrite');
      const store = transaction.objectStore('offlineSubmissions');

      const submissionData = {
        ...data,
        timestamp: Date.now(),
        synced: false
      };

      const addRequest = store.add(submissionData);

      addRequest.onsuccess = () => {
        console.log('[SW] Offline submission stored');
        resolve();
      };

      addRequest.onerror = () => reject(addRequest.error);
    };
  });
}

/**
 * Get offline page
 */
function getOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Ousamma Survey</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 20px;
        }
        .offline-container {
          background: white;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
          color: #333;
          margin-bottom: 16px;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        button {
          padding: 12px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        button:hover {
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>It looks like you've lost your internet connection. Don't worry, your survey responses are saved locally and will be submitted when you're back online.</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `;

  return new Response(offlineHTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background sync event - sync offline submissions when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-submissions') {
    event.waitUntil(syncOfflineSubmissions());
  }
});

/**
 * Sync offline submissions when back online
 */
async function syncOfflineSubmissions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OusammaSurveyDB', 1);

    request.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['offlineSubmissions'], 'readwrite');
      const store = transaction.objectStore('offlineSubmissions');

      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = async () => {
        const submissions = getAllRequest.result;

        console.log('[SW] Syncing', submissions.length, 'offline submissions');

        for (const submission of submissions) {
          if (!submission.synced) {
            try {
              // Submit to server
              const response = await fetch('/api/surveys/' + submission.surveyId + '/responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submission)
              });

              if (response.ok) {
                // Mark as synced
                submission.synced = true;
                store.put(submission);
                console.log('[SW] Submission synced:', submission.id);
              }
            } catch (error) {
              console.error('[SW] Error syncing submission:', error);
            }
          }
        }

        resolve();
      };
    };

    request.onerror = () => reject(request.error);
  });
}

// Message event - handle messages from client
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_SURVEY') {
    const { surveyId } = event.data;
    cacheSurveyData(surveyId);
  }
});

/**
 * Cache survey data for offline access
 */
async function cacheSurveyData(surveyId) {
  try {
    const cache = await caches.open(SURVEY_DATA_CACHE);
    const surveyUrl = `/api/surveys/${surveyId}`;

    const response = await fetch(surveyUrl);
    if (response.ok) {
      await cache.put(surveyUrl, response);
      console.log('[SW] Survey data cached:', surveyId);
    }
  } catch (error) {
    console.error('[SW] Error caching survey data:', error);
  }
}

// Push notification event (for future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New notification from Ousamma Survey',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Ousamma Survey', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[SW] Service Worker loaded successfully');
