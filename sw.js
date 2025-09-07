const CACHE_NAME = 'my-app-cache-v7'; // این نام کش فقط زمانی نیاز به تغییر دارد که شما لیست STATIC_ASSETS را تغییر دهید یا منطق Service Worker را به شدت عوض کنید، نه برای هر تغییر محتوا در HTML.
const STATIC_ASSETS = [
    // آدرس‌های دقیق فایل‌های استاتیک که همیشه باید سریعاً از کش لود شوند
    '/', // برای روت برنامه (index.html)
    'index.html',
    'karbari.html',
    // 'tablighat.html', // <<< از این لیست حذف شد تا همیشه از شبکه لود شود (اگر آنلاین باشد)
    'register.html', // صفحه ورود/ثبت‌نام (اگر وجود دارد)
    './css/style.css', // مسیر فایل‌های CSS شما
    './js/script.js',  // مسیر فایل‌های JS شما (اگر وجود دارد)
    './images/logo.png', // مسیر لوگو شما
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    // هر فایل CSS, JS یا تصویری که می‌خواهید همیشه از کش لود شود را اینجا اضافه کنید
];

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache static assets', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null;
                })
            );
        }).then(() => {
            // Ensure the service worker controls clients immediately after activation
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    // --- Strategy for HTML pages (Network First, then Cache Fallback) ---
    // This ensures HTML content (like tablighat.html) is always fresh if online
    if (event.request.mode === 'navigate' || 
        (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response; // If response is bad, don't cache, just return it
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                })
                .catch(() => {
                    // Network failed, try to get from cache
                    console.log('Service Worker: Network failed for HTML, trying cache for:', event.request.url);
                    return caches.match(event.request);
                })
        );
        return; // Important: Stop processing for HTML requests here
    }

    // --- Strategy for other static assets (Cache First, then Network) ---
    // This is for CSS, JS, images listed in STATIC_ASSETS
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // If found in cache, serve it immediately
                return cachedResponse;
            }

            // If not in cache, fetch from network
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                // Cache the newly fetched response
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // If both cache and network fail, you might want to show an offline fallback page
                console.error('Service Worker: Fetch failed for static asset and not in cache:', event.request.url);
                // Example: return caches.match('/offline.html');
                return new Response('Network error or resource not found in cache.', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            });
        })
    );
});

// Optional: Listen for messages from the main page (e.g., to skip waiting)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});