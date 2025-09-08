// Service Worker (sw.js) - Corrected Version

// همیشه این عدد را افزایش دهید تا مرورگر نسخه جدید Service Worker را تشخیص دهد
const CACHE_NAME = 'my-app-cache-v17'; // نام کش به v17 افزایش یافت

const STATIC_ASSETS = [
    // دارایی‌های استاتیک که به ندرت تغییر می‌کنند
    './images/logo.png',
    './images/favicon.ico',
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://www.soundjay.com/buttons/beep-07a.mp3',
];

// --- نصب Service Worker ---
self.addEventListener('install', (event) => {
    console.log('Service Worker v17: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker v17: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting()) // فعال‌سازی فوری
    );
});

// --- فعال‌سازی و پاک کردن کش‌های قدیمی ---
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
        }).then(() => clients.claim()) // کنترل فوری تمام صفحات
    );
});

// --- مدیریت هوشمند درخواست‌ها (Fetch) ---
self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // استراتژی 1: Network First برای API ها (حل مشکل پیام‌ها)
    // همیشه ابتدا تلاش می‌کند از اینترنت بگیرد، اگر نشد از کش استفاده می‌کند.
    if (requestUrl.hostname === 'weathered-sun-e806.toolbox-moein.workers.dev') {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    // استراتژی 2: Network First برای تصاویر بنر (حل مشکل عکس‌ها)
    if (requestUrl.pathname.includes('/images/sarbarg')) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    // استراتژی 3: Network First برای صفحات HTML (برای به‌روزرسانی فوری صفحات)
    if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }
    
    // استراتژی 4: Cache First برای سایر فایل‌ها (فونت، CSS، لوگو و...)
    // برای سرعت بالا، چون این فایل‌ها به ندرت تغییر می‌کنند.
    event.respondWith(cacheFirstStrategy(event.request));
});

// --- توابع کمکی برای استراتژی‌ها ---

// استراتژی اول شبکه (Network First)
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request, { cache: 'no-store' }); // اضافه شده برای اطمینان از عدم کش مرورگر
        
        // پاسخ معتبر را در کش ذخیره می‌کنیم
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn('Network request failed, trying cache for:', request.url);
        // اگر شبکه قطع بود، از کش استفاده کن
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // اگر در کش هم نبود، یک پاسخ خطای پیش‌فرض برگردان
        return new Response('Network error and not in cache.', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// استراتژی اول کش (Cache First)
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    // اگر در کش بود، همان را برگردان
    if (cachedResponse) {
        return cachedResponse;
    }
    // اگر نبود، از شبکه بگیر و در کش ذخیره کن
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