const CACHE_NAME = 'my-app-cache-v8'; // نام کش به v8 تغییر یافت تا سرویس ورکر جدید نصب شود و کش‌های قدیمی پاک شوند.
const STATIC_ASSETS = [
    // --- دارایی‌های استاتیک که باید در زمان نصب Service Worker کش شوند (Pre-cached) ---
    // فایل‌های HTML از این لیست حذف شدند تا همیشه از طریق استراتژی Network First (در fetch event) بررسی شوند.
    // این کار به همراه متاتگ‌های ضد کش در HTML، تضمین می‌کند که کاربران همیشه جدیدترین نسخه HTML را دریافت کنند.

    './images/logo.png', // لوگوی برنامه
    './images/sarbarg1.png', // بنر اول در index.html
    './images/sarbarg2.png', // بنر دوم در index.html
    
    // --- فونت‌ها و CSS خارجی ---
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',

    // --- فایل‌های صوتی ---
    'https://www.soundjay.com/buttons/beep-07a.mp3', // صدای نوتیفیکیشن
    
    // --- اگر فایل‌های CSS یا JS جداگانه دارید، اینجا اضافه کنید (با مسیر دقیق) ---
    // مثال: './styles/main.css',
    // مثال: './scripts/app.js',
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
                console.error('Service Worker: Failed to cache some static assets during install', error);
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
    // این استراتژی تضمین می‌کند که صفحات HTML همیشه جدیدترین محتوا را از شبکه دریافت کنند
    // و در صورت آفلاین بودن، از نسخه کش شده استفاده شود.
    if (event.request.mode === 'navigate' || 
        (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200) { // برای HTML، انتظار 200 OK داریم
                        return response; // If response is bad, don't cache, just return it
                    }
                    // Cache the newly fetched HTML response for offline use
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                })
                .catch(() => {
                    // Network failed, try to get from cache for offline support
                    console.log('Service Worker: Network failed for HTML, trying cache for:', event.request.url);
                    return caches.match(event.request);
                })
        );
        return; // Important: Stop processing for HTML requests here
    }

    // --- Strategy for other static assets (Cache First, then Network) ---
    // این استراتژی برای CSS, JS, تصاویر و فونت‌ها (که در STATIC_ASSETS لیست شده‌اند یا در طول زمان کش می‌شوند)
    // ابتدا از کش استفاده می‌کند و در صورت عدم وجود، از شبکه دریافت می‌کند.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // If found in cache, serve it immediately
                return cachedResponse;
            }

            // If not in cache, fetch from network
            return fetch(event.request).then((networkResponse) => {
                // --- بخش اصلاح شده برای کش کردن Opaque Responses (مانند فونت‌های Google) ---
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type === 'basic')) {
                    // اگر پاسخی دریافت نشد، یا پاسخ از نوع 'basic' (همان مبدأ) بود و وضعیت 200 OK نداشت،
                    // آن را کش نکن و مستقیماً برگردان.
                    // پاسخ‌های 'opaque' (مثلاً فونت‌های Google) با status=0 هم قابل کش شدن هستند.
                    return networkResponse;
                }
                // --- پایان بخش اصلاح شده ---

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