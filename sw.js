// Service Worker (sw.js) - v17 - Final Corrected Version

const CACHE_NAME = 'my-app-cache-v17'; // افزایش نسخه برای پاکسازی کامل کش قدیمی

// فقط دارایی‌های کاملاً استاتیک و بدون تغییر در اینجا قرار می‌گیرند
const STATIC_ASSETS = [
    './images/logo.png',
    './images/favicon.ico',
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://www.soundjay.com/buttons/beep-07a.mp3',
];

self.addEventListener('install', (event) => {
    console.log('Service Worker v17: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker v17: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting()) 
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker v17: Activating and cleaning old caches...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker v17: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => clients.claim()) 
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    if (requestUrl.hostname === 'weathered-sun-e806.toolbox-moein.workers.dev') {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    if (requestUrl.pathname.includes('/images/sarbarg')) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }
    
    event.respondWith(cacheFirstStrategy(event.request));
});

async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request, { cache: 'no-store' }); 
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn('Network request failed, trying cache for:', request.url);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Network error and not in cache.', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('Failed to fetch and not in cache:', request.url);
    }
}