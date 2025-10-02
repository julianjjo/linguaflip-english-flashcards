// Service Worker for LinguaFlip - Offline Support
const CACHE_NAME = 'linguaflip-v1.0.0';
const STATIC_CACHE = 'linguaflip-static-v1.0.0';
const DYNAMIC_CACHE = 'linguaflip-dynamic-v1.0.0';
const IMAGE_CACHE = 'linguaflip-images-v1.0.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  // Add your main CSS and JS files here when built
];

// API endpoints to cache
const API_ENDPOINTS = ['/api/cards', '/api/progress', '/api/settings'];

// External resources that should be cached
const EXTERNAL_RESOURCES = [
  'https://picsum.photos',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),

      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== IMAGE_CACHE
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method !== 'GET') {
    return; // Don't cache POST, PUT, DELETE, etc.
  }

  // Handle image requests
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle API requests
  if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// Check if request is for an image
function isImageRequest(request) {
  return (
    request.destination === 'image' ||
    request.url.includes('.jpg') ||
    request.url.includes('.jpeg') ||
    request.url.includes('.png') ||
    request.url.includes('.gif') ||
    request.url.includes('.webp') ||
    request.url.includes('picsum.photos')
  );
}

// Check if request is for API
function isApiRequest(request) {
  return (
    request.url.includes('/api/') ||
    API_ENDPOINTS.some((endpoint) => request.url.includes(endpoint))
  );
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Image fetch failed:', error);

    // Return offline fallback
    return new Response(
      JSON.stringify({
        error: 'Image not available offline',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] API fetch failed, trying cache:', error);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Content not available offline',
        offline: true,
        cached: false,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Static fetch failed:', error);

    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      return (
        cache.match('/') ||
        new Response(
          `
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinguaFlip - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; }
            .offline-message { max-width: 400px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <h1>🔌 You're Offline</h1>
            <p>LinguaFlip is not available right now. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
        </html>
        `,
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/html' },
          }
        )
      );
    }

    return new Response('Offline', { status: 503 });
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // This could retry failed API requests, sync local changes, etc.
  console.log('[SW] Performing background sync...');
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body || 'You have new updates!',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: data,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'LinguaFlip', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});

// Periodic background fetch (for future use)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  console.log('[SW] Periodic content sync...');
  // Implement periodic content updates here
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;

      case 'GET_CACHE_STATS':
        getCacheStats().then((stats) => {
          event.ports[0].postMessage({ type: 'CACHE_STATS', stats });
        });
        break;

      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
        });
        break;

      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }

  return stats;
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();

  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

  console.log('[SW] All caches cleared');
}
