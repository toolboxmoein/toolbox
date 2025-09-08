// Service Worker (sw.js) - Ultra Aggressive Update Strategy
// نسخه فوق تهاجمی برای حل مشکلات کش

const CACHE_NAME = 'my-app-cache-v15'; // افزایش مجدد نسخه

const STATIC_ASSETS = [
    // فقط فایل‌های ضروری که مطمئن هستیم مشکل ندارند
    './images/logo.png',
    './images/favicon.ico',
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
];

self.addEventListener('install', (event) => {
    console.log('Service Worker v15: Force installing');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker v15: Skipping waiting immediately');
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker v15: Force activating');
    event.waitUntil(
        // پاک کردن تمام کش‌های قدیمی
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    console.log('Service Worker v15: Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
        .then(() => {
            console.log('Service Worker v15: Claiming all clients');
            return clients.claim();
        })
        .then(() => {
            // اجبار به reload تمام صفحات
            return clients.matchAll();
        })
        .then(clients => {
            clients.forEach(client => {
                console.log('Service Worker v15: Forcing reload for client');
                client.postMessage({ type: 'FORCE_RELOAD_NOW' });
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    
    // استراتژی Network-Only برای API های Cloudflare Worker
    if (requestUrl.hostname === 'weathered-sun-e806.toolbox-moein.workers.dev') {
        console.log('Service Worker v15: Network-Only for API:', event.request.url);
        event.respondWith(
            fetch(event.request, {
                cache: 'no-cache', // اجبار به عدم استفاده از کش
                headers: {
                    ...event.request.headers,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            }).catch(error => {
                console.error('Service Worker v15: API request failed:', error);
                return new Response(JSON.stringify({
                    error: 'Network error',
                    message: 'لطفاً اتصال اینترنت خود را بررسی کنید'
                }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // استراتژی Network-Only برای تصاویر بنر
    if (requestUrl.pathname.includes('/images/sarbarg')) {
        console.log('Service Worker v15: Network-Only for banner:', event.request.url);
        event.respondWith(
            fetch(event.request, {
                cache: 'no-cache'
            }).catch(() => {
                console.log('Service Worker v15: Banner fetch failed, no fallback');
                return new Response('', { status: 404 });
            })
        );
        return;
    }

    // استراتژی Network-First برای HTML با timestamp
    if (event.request.mode === 'navigate' || 
        (event.request.method === 'GET' && 
         (requestUrl.pathname.endsWith('.html') || 
          event.request.headers.get('accept')?.includes('text/html')))) {
        
        console.log('Service Worker v15: Network-First for HTML:', event.request.url);
        
        // اضافه کردن timestamp برای جلوگیری از کش
        const urlWithTimestamp = new URL(event.request.url);
        urlWithTimestamp.searchParams.set('_t', Date.now().toString());
        
        const modifiedRequest = new Request(urlWithTimestamp.toString(), {
            method: event.request.method,
            headers: {
                ...event.request.headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            },
            mode: event.request.mode,
            credentials: event.request.credentials,
            redirect: event.request.redirect
        });

        event.respondWith(
            fetch(modifiedRequest)
                .then(response => {
                    if (response && response.status === 200) {
                        return response;
                    }
                    throw new Error('Invalid response');
                })
                .catch(() => {
                    console.log('Service Worker v15: HTML fetch failed, trying cache');
                    return caches.match(event.request);
                })
        );
        return;
    }

    // برای سایر فایل‌ها: Network-First ساده
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// پیام‌های اجباری برای reload
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        });
    }
});