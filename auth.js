// فایل: auth.js (کامل و اصلاح شده برای سمت کلاینت)

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
    if (message.includes("خطا در ایجاد درخواست پرداخت")) {
        return "مشکلی در ایجاد درخواست پرداخت در سمت سرور رخ داد. لطفاً با پشتیبانی تماس بگیرید.";
    }
    // NEW: Password Reset Translations
    if (message.includes("لطفاً ایمیل خود را وارد کنید.")) {
        return "لطفاً ایمیل خود را وارد کنید.";
    }
    if (message.includes("توکن بازیابی نامعتبر یا منقضی شده است.")) {
        return "لینک بازیابی رمز عبور نامعتبر یا منقضی شده است. لطفاً دوباره درخواست دهید.";
    }
    if (message.includes("رمز عبور جدید باید حداقل 6 کاراکتر باشد.")) {
        return "رمز عبور جدید باید حداقل 6 کاراکتر باشد.";
    }
    if (message.includes("اطلاعات بازیابی رمز عبور ناقص است.")) {
        return "اطلاعات بازیابی رمز عبور ناقص است. لطفاً مطمئن شوید از لینک صحیح استفاده می‌کنید.";
    }
    if (message.includes("خطایی در ارسال ایمیل بازیابی رخ داد. لطفاً دوباره تلاش کنید.")) {
        return "خطایی در ارسال ایمیل بازیابی رخ داد. لطفاً با پشتیبانی تماس بگیرید.";
    }
    // END: Password Reset Translations
    // START: CHANGE - ترجمه جدید برای خطای تداخل ورود
    if (message.includes("login_conflict")) {
        return "شما قبلاً در دستگاه دیگری وارد شده‌اید. لطفاً در دستگاه جدید تایید کنید.";
    }
    // END: CHANGE

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

// --- ورود کاربر (با اضافه شدن deviceId و مدیریت خطای تداخل) ---
export async function signIn(email, password, deviceId) { // START: CHANGE - اضافه شدن deviceId
    try {
        const response = await fetch(`${WORKER_URL}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // START: CHANGE - ارسال deviceId در بدنه درخواست
            body: JSON.stringify({ email, password, deviceId })
            // END: CHANGE
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
            // START: CHANGE - بررسی و بازگرداندن خطای تداخل ورود
            if (data.error === "login_conflict") {
                return { data: null, error: { message: translateWorkerError(data.error), type: 'login_conflict' } };
            }
            // END: CHANGE
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در ورود رخ داد.') } };
        }

    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست ورود به Worker:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره در ورود رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// START: CHANGE - تابع جدید برای ورود اجباری (Placeholder)
// این تابع باید توسط شما در Cloudflare Worker پیاده‌سازی شود
export async function forceSignIn(email, password, deviceId) {
    console.log("Calling forceSignIn (frontend placeholder)...");
    try {
        // این یک شبیه‌سازی است. در واقعیت، Worker باید این درخواست را مدیریت کند.
        // Worker شما باید سشن قدیمی را باطل کرده و سشن جدید را ایجاد کند.
        const response = await fetch(`${WORKER_URL}/forcesignin`, { // فرض کنید یک endpoint جدید برای forceSignIn دارید
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, deviceId, force: true }) // ارسال پرچم force
        });

        const data = await response.json();

        if (response.ok) {
            if (data.sessionToken && data.user) {
                localStorage.setItem('sessionToken', data.sessionToken);
                return { success: true, data: { user: data.user }, error: null };
            } else {
                return { success: false, error: { message: 'پاسخ ورود اجباری از سرور کامل نیست.' } };
            }
        } else {
            console.error('خطا از Worker در ورود اجباری:', data.error || 'خطای ناشناخته');
            return { success: false, error: { message: translateWorkerError(data.error || 'خطایی در ورود اجباری رخ داد.') } };
        }
    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست ورود اجباری به Worker:', e);
        return { success: false, error: { message: 'یک خطای شبکه یا غیرمنتظره در ورود اجباری رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}
// END: CHANGE

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


// --- بررسی وضعیت لاگین و گرفتن نشست (با اضافه شدن deviceId) ---
export async function getSession() {
    try {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            return null;
        }

        // START: CHANGE - بازیابی deviceId از localStorage
        const deviceId = localStorage.getItem('deviceId');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
        };
        if (deviceId) {
            headers['X-Device-Id'] = deviceId; // ارسال deviceId در هدر
        }
        // END: CHANGE

        const response = await fetch(`${WORKER_URL}/getsession`, {
            method: 'POST',
            headers: headers // START: CHANGE - استفاده از هدرهای اصلاح شده
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

// --- تابع جدید برای درخواست بازیابی رمز عبور ---
export async function requestPasswordReset(email) {
    try {
        const response = await fetch(`${WORKER_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            return { data: data.message, error: null };
        } else {
            console.error('خطا از Worker در درخواست بازیابی رمز عبور:', data.error || 'خطای ناشناخته');
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در درخواست بازیابی رمز عبور رخ داد.') } };
        }
    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست بازیابی رمز عبور به Worker:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- تابع جدید برای ارسال رمز عبور جدید ---
export async function submitNewPassword(token, email, newPassword) {
    try {
        const response = await fetch(`${WORKER_URL}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, email, newPassword })
        });

        const data = await response.json();

        if (response.ok) {
            return { data: data.message, error: null };
        } else {
            console.error('خطا از Worker در تنظیم مجدد رمز عبور:', data.error || 'خطای ناشناخته');
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در تنظیم مجدد رمز عبور رخ داد.') } };
        }
    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال رمز عبور جدید به Worker:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- تابع جدید برای مدیریت درخواست پرداخت ---
export async function createPaymentRequest(plan, amount) {
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
        return { paymentUrl: null, error: { message: 'نشست شما نامعتبر است. لطفاً دوباره وارد شوید.' } };
    }

    try {
        const response = await fetch(`${WORKER_URL}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ plan, amount })
        });

        const data = await response.json();

        if (response.ok && data.paymentUrl) {
            return { paymentUrl: data.paymentUrl, error: null };
        } else {
            console.error('خطا از Worker در ایجاد پرداخت:', data.error || 'خطای ناشناخته');
            return { paymentUrl: null, error: { message: translateWorkerError(data.error || 'خطایی در ایجاد پرداخت رخ داد.') } };
        }

    } catch (e) {
        console.error('خطای غیرمنتظره در ارسال درخواست پرداخت به Worker:', e);
        return { paymentUrl: null, error: { message: 'یک خطای شبکه یا غیرمنتظره در فرآیند پرداخت رخ داد.' } };
    }
}