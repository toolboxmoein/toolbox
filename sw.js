// Service Worker (sw.js) - Aggressive Update Strategy

// همیشه این عدد را افزایش دهید تا مرورگر نسخه جدید Service Worker را تشخیص دهد
const CACHE_NAME = 'my-app-cache-v13'; // نام کش به v13 افزایش یافت

const STATIC_ASSETS = [
    // --- دارایی‌های استاتیک که باید در زمان نصب Service Worker کش شوند (Pre-cached) ---
    // فایل‌های HTML از این لیست حذف شدند تا همیشه از طریق استراتژی Network First (در fetch event) بررسی شوند.
    // این کار به همراه متاتگ‌های ضد کش در HTML، تضمین می‌کند که کاربران همیشه جدیدترین نسخه HTML را دریافت کنند.

    './images/logo.png', // لوگوی برنامه
    // تصاویر sarbarg از اینجا حذف شدند تا استراتژی NetworkFirst خاص خود را داشته باشند
    './images/favicon.ico', // آیکون سایت
    
    // --- فونت‌ها و CSS خارجی ---
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',

    // --- فایل‌های صوتی ---
    'https://www.soundjay.com/buttons/beep-07a.mp3', // صدای نوتیفیکیشن
    
    // --- اگر فایل‌های CSS یا JS جداگانه دارید، اینجا اضافه کنید (با مسیر دقیق) ---
    // مثال: './styles/main.css',
    // مثال: './scripts/app.js',
];

self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing cache v' + CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                // فقط دارایی‌های استاتیک غیر HTML و غیر بنر را کش کن
                return cache.addAll(STATIC_ASSETS);
            })
            // بلافاصله Service Worker را فعال کن، بدون نیاز به بستن تب‌های قبلی
            .then(() => self.skipWaiting()) 
            .catch((error) => console.error('Service Worker: Cache addAll failed', error))
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating and claiming clients for cache v' + CACHE_NAME);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        // بلافاصله کنترل تمام تب‌های فعلی را به دست بگیر
        .then(() => clients.claim()) 
        .then(() => {
            // پس از کنترل گرفتن، به تمام کلاینت‌ها (تب‌ها) پیام بده تا رفرش کنند
            clients.matchAll().then(clientList => {
                clientList.forEach(client => {
                    client.postMessage({ type: 'RELOAD_PAGE_AFTER_SW_CLAIM' });
                });
            });
        })
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // --- استراتژی NetworkFirst برای تصاویر بنر (sarbarg) ---
    // این تضمین می‌کند که تصاویر بنر همیشه از شبکه گرفته می‌شوند تا جدیدترین نسخه نمایش داده شود.
    if (requestUrl.pathname.includes('/images/sarbarg')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // پس از دریافت از شبکه، آن را در کش به‌روزرسانی کن
                    // (برای استفاده آفلاین در آینده، اما همیشه ابتدا شبکه را امتحان کن)
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // اگر شبکه در دسترس نبود، از کش (حتی اگر قدیمی باشد) استفاده کن
                    console.log('Service Worker: Network failed for sarbarg image, trying cache:', event.request.url);
                    return caches.match(event.request);
                })
        );
        return;
    }

    // --- استراتژی NetworkFirst برای درخواست‌های ناوبری (مانند باز کردن صفحات HTML) ---
    // این تضمین می‌کند که کاربران همیشه جدیدترین نسخه HTML صفحات را دریافت می‌کنند.
    if (event.request.mode === 'navigate' || (event.request.method === 'GET' && requestUrl.pathname.endsWith('.html') || event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200) { 
                        return response; 
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
                    // در صورت آفلاین بودن، صفحه کش شده مربوطه را برگردان
                    return caches.match(event.request);
                })
        );
        return; 
    }

    // --- استراتژی CacheFirst برای سایر دارایی‌ها (CSS, JS, سایر تصاویر) ---
    // این برای سرعت بارگذاری و قابلیت آفلاین بودن مفید است. با تغییر CACHE_NAME به‌روز می‌شوند.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // اگر پاسخی دریافت نشد، یا پاسخ از نوع 'basic' (همان مبدأ) بود و وضعیت 200 OK نداشت،
                // آن را کش نکن و مستقیماً برگردان. پاسخ‌های 'opaque' (مثلاً فونت‌های Google) با status=0 هم قابل کش شدن هستند.
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type === 'basic')) {
                    return networkResponse;
                }

                // Cache the newly fetched response
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                console.error('Service Worker: Fetch failed for static asset and not in cache:', event.request.url);
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

// Listener for messages from the main page (e.g., to skip waiting)
self.addEventListener('message', (event) => {
    // اگر پیامی برای فعال کردن Service Worker جدید دریافت شد
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    // اگر پیامی برای به‌روزرسانی تعداد پیام‌های خوانده نشده دریافت شد (از message.html)
    if (event.data && (event.data.type === 'MESSAGE_READ' || event.data.type === 'UPDATE_UNREAD_COUNT')) {
        clients.matchAll().then(clientList => {
            clientList.forEach(client => {
                // این پیام را به تمام تب‌های باز (مخصوصاً index.html) ارسال کن
                // تا بتوانند badge پیام‌های خوانده نشده را به‌روز کنند
                client.postMessage(event.data); 
            });
        });
    }
});