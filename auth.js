// فایل: auth.js (کامل و اصلاح شده)

// این فایل مسئول ارتباط با Worker کلودفلر برای احراز هویت است.

// آدرس Worker کلودفلر شما - آدرس صحیح
const WORKER_URL = 'https://weathered-sun-e806.toolbox-moein.workers.dev';

// تابع کمکی برای ترجمه خطاهای Worker به فارسی
function translateWorkerError(message) {
    if (message.includes("لطفاً تمام فیلدها را پر کنید.")) {
        return "لطفاً تمام فیلدهای نام، نام خانوادگی، ایمیل و رمز عبور را پر کنید.";
    }
    if (message.includes("رمز عبور باید حداقل ۶ کاراکتر باشد.")) {
        return "رمز عبور باید حداقل ۶ کاراکتر باشد.";
    }
    if (message.includes("این ایمیل قبلاً ثبت‌نام شده است.")) {
        return "این ایمیل قبلاً ثبت‌نام شده است. لطفاً وارد شوید.";
    }
    if (message.includes("ایمیل یا رمز عبور وارد شده اشتباه است.")) {
        return "ایمیل یا رمز عبور وارد شده اشتباه است.";
    }
    if (message.includes("کاربر یافت نشد.")) {
        return "کاربری با این ایمیل یافت نشد.";
    }
    if (message.includes("نشست نامعتبر است.")) {
        return "نشست شما نامعتبر یا منقضی شده است. لطفاً دوباره وارد شوید.";
    }
    if (message.includes("مشکلی در اتصال به سرور پیش آمد.")) {
        return "مشکلی در اتصال به سرور پیش آمد. لطفاً دوباره تلاش کنید.";
    }
    return message;
}

// --- ثبت‌نام کاربر جدید (نسخه اصلاح شده برای ورود خودکار) ---
export async function signUp(email, password, firstName, lastName) {
    try {
        const response = await fetch(`${WORKER_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firstName, lastName, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // تغییر اصلی: انتظار داریم worker بعد از ثبت‌نام، توکن ورود را هم برگرداند
            if (data.sessionToken && data.user) {
                localStorage.setItem('sessionToken', data.sessionToken);
                return {
                    data: {
                        session: {
                            accessToken: data.sessionToken,
                            user: data.user
                        },
                        user: data.user
                    },
                    error: null
                };
            } else {
                return { data: null, error: { message: 'پاسخ ثبت‌نام از سرور کامل نیست.' } };
            }
        } else {
            console.error('خطا از Worker در ثبت‌نام:', data.error || 'خطای ناشناخته');
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در ثبت‌نام رخ داد.') } };
        }

    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست ثبت‌نام به Worker:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره در ثبت‌نام رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- ورود کاربر (بدون تغییر) ---
export async function signIn(email, password) {
    try {
        const response = await fetch(`${WORKER_URL}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.sessionToken && data.user) {
                localStorage.setItem('sessionToken', data.sessionToken);
                return {
                    data: {
                        session: {
                            accessToken: data.sessionToken,
                            user: data.user
                        },
                        user: data.user
                    },
                    error: null
                };
            } else {
                return { data: null, error: { message: 'پاسخ ورود از سرور کامل نیست.' } };
            }
        } else {
            console.error('خطا از Worker در ورود:', data.error || 'خطای ناشناخته');
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در ورود رخ داد.') } };
        }

    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست ورود به Worker:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره در ورود رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- خروج کاربر (بدون تغییر) ---
export async function signOut() {
    try {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            console.log('توکن نشستی برای خروج وجود ندارد.');
            return true;
        }

        const response = await fetch(`${WORKER_URL}/signout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        if (response.ok) {
            localStorage.removeItem('sessionToken');
            console.log('خروج با موفقیت انجام شد.');
            return true;
        } else {
            const errorData = await response.json();
            console.error('خطا از Worker در خروج:', errorData.error || 'خطای ناشناخته');
            // حتی اگر خروج در سرور خطا داد، توکن را از کلاینت پاک می‌کنیم
            localStorage.removeItem('sessionToken');
            return true; 
        }

    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست خروج به Worker:', e);
        localStorage.removeItem('sessionToken');
        return true;
    }
}


// --- بررسی وضعیت لاگین و گرفتن نشست (بدون تغییر) ---
export async function getSession() {
    try {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            return null;
        }

        const response = await fetch(`${WORKER_URL}/getsession`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            }
        });

        const data = await response.json();

        if (response.ok && data.user) {
            return {
                accessToken: sessionToken,
                user: data.user
            };
        } else {
            localStorage.removeItem('sessionToken');
            console.error('خطا از Worker در گرفتن نشست:', data.error || 'نشست نامعتبر است.');
            return null;
        }

    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست getSession به Worker:', e);
        localStorage.removeItem('sessionToken');
        return null;
    }
}