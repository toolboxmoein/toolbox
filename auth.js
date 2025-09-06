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
    if (message.includes("login_conflict")) {
        return "شما قبلاً در دستگاه دیگری وارد شده‌اید. لطفاً در دستگاه جدید تایید کنید.";
    }

    return message;
}

// --- ثبت‌نام کاربر جدید (نسخه اصلاح شده برای ورود خودکار) ---
export async function signUp(email, password, firstName, lastName) {
    console.log("auth.js: Attempting signUp for", email);
    try {
        const response = await fetch(`${WORKER_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firstName, lastName, email, password })
        });

        const data = await response.json();
        console.log("auth.js: signUp response status:", response.status, "data:", data);

        if (response.ok) {
            if (data.sessionToken && data.user) {
                localStorage.setItem('sessionToken', data.sessionToken);
                console.log("auth.js: signUp successful, sessionToken stored:", data.sessionToken.substring(0, 10) + '...');
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
                console.error("auth.js: signUp response missing sessionToken or user.");
                return { data: null, error: { message: 'پاسخ ثبت‌نام از سرور کامل نیست.' } };
            }
        } else {
            console.error('auth.js: Error from Worker during signUp:', data.error || 'خطای ناشناخته');
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در ثبت‌نام رخ داد.') } };
        }

    } catch (e) {
        console.error('auth.js: Unexpected error in signUp fetch:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره در ثبت‌نام رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- ورود کاربر (با اضافه شدن deviceId و مدیریت خطای تداخل) ---
export async function signIn(email, password, deviceId) {
    console.log("auth.js: Attempting signIn for", email, "with deviceId:", deviceId);
    try {
        const response = await fetch(`${WORKER_URL}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, deviceId })
        });

        const data = await response.json();
        console.log("auth.js: signIn response status:", response.status, "data:", data);

        if (response.ok) {
            if (data.sessionToken && data.user) {
                localStorage.setItem('sessionToken', data.sessionToken);
                console.log("auth.js: signIn successful, sessionToken stored:", data.sessionToken.substring(0, 10) + '...');
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
                console.error("auth.js: signIn response missing sessionToken or user.");
                return { data: null, error: { message: 'پاسخ ورود از سرور کامل نیست.' } };
            }
        } else {
            console.error('auth.js: Error from Worker during signIn:', data.error || 'خطای ناشناخته');
            if (data.error === "login_conflict") {
                return { data: null, error: { message: translateWorkerError(data.error), type: 'login_conflict' } };
            }
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در ورود رخ داد.') } };
        }

    } catch (e) {
        console.error('auth.js: Unexpected error in signIn fetch:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره در ورود رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- تابع جدید برای ورود اجباری (Placeholder) ---
export async function forceSignIn(email, password, deviceId) {
    console.log("auth.js: Calling forceSignIn (frontend placeholder) for", email, "with deviceId:", deviceId);
    try {
        const response = await fetch(`${WORKER_URL}/forcesignin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, deviceId, force: true })
        });

        const data = await response.json();
        console.log("auth.js: forceSignIn response status:", response.status, "data:", data);

        if (response.ok) {
            if (data.sessionToken && data.user) {
                localStorage.setItem('sessionToken', data.sessionToken);
                console.log("auth.js: forceSignIn successful, sessionToken stored:", data.sessionToken.substring(0, 10) + '...');
                return { success: true, data: { user: data.user }, error: null };
            } else {
                console.error("auth.js: forceSignIn response missing sessionToken or user.");
                return { success: false, error: { message: 'پاسخ ورود اجباری از سرور کامل نیست.' } };
            }
        } else {
            console.error('auth.js: Error from Worker during forceSignIn:', data.error || 'خطای ناشناخته');
            return { success: false, error: { message: translateWorkerError(data.error || 'خطایی در ورود اجباری رخ داد.') } };
        }
    } catch (e) {
        console.error('auth.js: Unexpected error in forceSignIn fetch:', e);
        return { success: false, error: { message: 'یک خطای شبکه یا غیرمنتظره در ورود اجباری رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- خروج کاربر ---
export async function signOut() {
    console.log("auth.js: Attempting signOut.");
    try {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            console.log('auth.js: No session token found for signOut, proceeding with local cleanup.');
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
            console.log('auth.js: signOut successful, sessionToken removed from localStorage.');
            return true;
        } else {
            const errorData = await response.json();
            console.error('auth.js: Error from Worker during signOut:', errorData.error || 'خطای ناشناخته');
            localStorage.removeItem('sessionToken');
            return true;
        }

    } catch (e) {
        console.error('auth.js: Unexpected error in signOut fetch:', e);
        localStorage.removeItem('sessionToken');
        return true;
    }
}

// --- بررسی وضعیت لاگین و گرفتن نشست (با اضافه شدن deviceId) ---
export async function getSession() {
    console.log("auth.js: Attempting getSession.");
    try {
        const sessionToken = localStorage.getItem('sessionToken');
        if (!sessionToken) {
            console.log('auth.js: No sessionToken found in localStorage.');
            return null;
        }
        console.log('auth.js: sessionToken found:', sessionToken.substring(0, 10) + '...');

        const deviceId = localStorage.getItem('deviceId');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
        };
        if (deviceId) {
            headers['X-Device-Id'] = deviceId;
            console.log('auth.js: Sending X-Device-Id header:', deviceId.substring(0, 10) + '...');
        }

        const response = await fetch(`${WORKER_URL}/getsession`, {
            method: 'POST',
            headers: headers
        });

        const data = await response.json();
        console.log("auth.js: getSession response status:", response.status, "data:", data);

        if (response.ok && data.user) {
            console.log('auth.js: getSession successful, user data received.');
            return {
                accessToken: sessionToken,
                user: data.user
            };
        } else {
            console.error('auth.js: Error from Worker during getSession or session invalid:', data.error || 'نشست نامعتبر است.');
            localStorage.removeItem('sessionToken');
            console.log('auth.js: Invalid session, sessionToken removed from localStorage.');
            return null;
        }

    } catch (e) {
        console.error('auth.js: Unexpected error in getSession fetch:', e);
        localStorage.removeItem('sessionToken');
        console.log('auth.js: Error during getSession, sessionToken removed from localStorage.');
        return null;
    }
}

// --- تابع جدید برای درخواست بازیابی رمز عبور ---
export async function requestPasswordReset(email) {
    console.log("auth.js: Attempting requestPasswordReset for", email);
    try {
        const response = await fetch(`${WORKER_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        console.log("auth.js: requestPasswordReset response status:", response.status, "data:", data);

        if (response.ok) {
            return { data: data.message, error: null };
        } else {
            console.error('auth.js: Error from Worker in requestPasswordReset:', data.error || 'خطای ناشناخته');
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در درخواست بازیابی رمز عبور رخ داد.') } };
        }
    } catch (e) {
        console.error('auth.js: Unexpected error in requestPasswordReset fetch:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- تابع جدید برای ارسال رمز عبور جدید ---
export async function submitNewPassword(token, email, newPassword) {
    console.log("auth.js: Attempting submitNewPassword for", email);
    try {
        const response = await fetch(`${WORKER_URL}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, email, newPassword })
        });

        const data = await response.json();
        console.log("auth.js: submitNewPassword response status:", response.status, "data:", data);

        if (response.ok) {
            return { data: data.message, error: null };
        } else {
            console.error('auth.js: Error from Worker in submitNewPassword:', data.error || 'خطای ناشناخته');
            return { data: null, error: { message: translateWorkerError(data.error || 'خطایی در تنظیم مجدد رمز عبور رخ داد.') } };
        }
    } catch (e) {
        console.error('auth.js: Unexpected error in submitNewPassword fetch:', e);
        return { data: null, error: { message: 'یک خطای شبکه یا غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید.' } };
    }
}

// --- تابع جدید برای مدیریت درخواست پرداخت ---
export async function createPaymentRequest(plan, amount) {
    console.log("auth.js: Attempting createPaymentRequest for plan", plan, "amount", amount);
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
        console.error("auth.js: createPaymentRequest failed: No session token found.");
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
        console.log("auth.js: createPaymentRequest response status:", response.status, "data:", data);

        if (response.ok && data.paymentUrl) {
            return { paymentUrl: data.paymentUrl, error: null };
        } else {
            console.error('auth.js: Error from Worker in createPaymentRequest:', data.error || 'خطای ناشناخته');
            return { paymentUrl: null, error: { message: translateWorkerError(data.error || 'خطایی در ایجاد پرداخت رخ داد.') } };
        }

    } catch (e) {
        console.error('auth.js: Unexpected error in createPaymentRequest fetch:', e);
        return { paymentUrl: null, error: { message: 'یک خطای شبکه یا غیرمنتظره در فرآیند پرداخت رخ داد.' } };
    }
}