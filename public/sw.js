// TradeMaster Pro Service Worker
// Enhanced caching and offline support for iPad usage

const CACHE_NAME = 'trademaster-v1.0.0'
const OFFLINE_URL = '/offline.html'

// Resources to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
]

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\//,
  /supabase\.co\/rest\//,
]

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installing...')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static resources...')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully')
        // Force the waiting service worker to become active
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated successfully')
        // Ensure the service worker takes control immediately
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests with caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Handle static resources with cache-first strategy
  event.respondWith(handleStaticResourceRequest(request))
})

// Handle API requests (network-first with fallback to cache)
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)

    // If successful, cache the response for future use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('🌐 Network failed, trying cache for:', request.url)

    // Network failed, try cache
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      console.log('📦 Serving from cache:', request.url)
      return cachedResponse
    }

    // No cache available, return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'אין חיבור לאינטרנט'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle navigation requests (cache-first with network fallback)
async function handleNavigationRequest(request) {
  try {
    // Try cache first for instant loading
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      console.log('📦 Serving navigation from cache:', request.url)
      return cachedResponse
    }

    // No cache, try network
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('🌐 Navigation request failed, serving offline page')

    // Return offline page
    const offlineResponse = await caches.match(OFFLINE_URL)

    if (offlineResponse) {
      return offlineResponse
    }

    // Fallback offline response
    return new Response(
      `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>לא מחובר - TradeMaster Pro</title>
        <style>
          body {
            font-family: 'Assistant', Arial, sans-serif;
            direction: rtl;
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .offline-container {
            max-width: 400px;
            padding: 2rem;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          h1 { margin-bottom: 1rem; }
          p { margin-bottom: 1.5rem; line-height: 1.6; }
          button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover { background: #45a049; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <h1>🚫 לא מחובר לאינטרנט</h1>
          <p>נראה שאין לך חיבור לאינטרנט כרגע. האפליקציה תעבוד במצב לא מקוון עם הנתונים השמורים.</p>
          <button onclick="location.reload()">נסה שוב</button>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    )
  }
}

// Handle static resources (cache-first strategy)
async function handleStaticResourceRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // No cache, fetch from network
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('❌ Failed to load resource:', request.url)
    return new Response('Resource not available', { status: 404 })
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)

  if (event.tag === 'trademaster-sync') {
    event.waitUntil(syncOfflineData())
  }
})

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    console.log('📡 Syncing offline data...')

    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions()

    for (const action of offlineActions) {
      try {
        // Attempt to sync each action
        await syncAction(action)

        // Remove successful action from offline storage
        await removeOfflineAction(action.id)

        console.log('✅ Synced offline action:', action.type)
      } catch (error) {
        console.error('❌ Failed to sync offline action:', error)
      }
    }

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      })
    })

  } catch (error) {
    console.error('❌ Background sync failed:', error)
  }
}

// Helper functions for offline storage (using IndexedDB)
async function getOfflineActions() {
  return new Promise((resolve) => {
    const request = indexedDB.open('TradeMasterOffline', 1)

    request.onerror = () => resolve([])

    request.onsuccess = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains('offlineActions')) {
        resolve([])
        return
      }

      const transaction = db.transaction(['offlineActions'], 'readonly')
      const store = transaction.objectStore('offlineActions')
      const getAllRequest = store.getAll()

      getAllRequest.onsuccess = () => resolve(getAllRequest.result)
      getAllRequest.onerror = () => resolve([])
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains('offlineActions')) {
        const store = db.createObjectStore('offlineActions', { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

async function removeOfflineAction(id) {
  return new Promise((resolve) => {
    const request = indexedDB.open('TradeMasterOffline', 1)

    request.onsuccess = (event) => {
      const db = event.target.result
      const transaction = db.transaction(['offlineActions'], 'readwrite')
      const store = transaction.objectStore('offlineActions')
      store.delete(id)
      transaction.oncomplete = () => resolve()
    }
  })
}

async function syncAction(action) {
  // This would contain the actual sync logic for each action type
  // For now, just log the action
  console.log('🔄 Syncing action:', action)

  // Here you would implement the actual sync logic based on action.type
  // For example:
  // - 'CREATE_TRADE': POST to /api/trades
  // - 'UPDATE_TRADE': PUT to /api/trades/:id
  // - 'DELETE_TRADE': DELETE to /api/trades/:id
  // etc.
}

// Push notifications for real-time updates
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received')

  if (!event.data) return

  try {
    const data = event.data.json()

    const options = {
      body: data.body || 'יש עדכון חדש ב-TradeMaster Pro',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag || 'trademaster-update',
      data: data.url || '/',
      actions: [
        {
          action: 'view',
          title: 'צפה'
        },
        {
          action: 'dismiss',
          title: 'סגור'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'TradeMaster Pro', options)
    )
  } catch (error) {
    console.error('❌ Failed to show push notification:', error)
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action)

  event.notification.close()

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    )
  }
})

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('📨 Message received in service worker:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})