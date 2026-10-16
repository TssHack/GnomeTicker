// Shared, dependency-free helpers used by both the shell extension and the
// preferences window.

export const API_URL = 'https://catplus.ir/api/tgju';
export const MAX_PINNED = 3;

export const TRANSLATIONS = {
    "طلا": "Gold",
    "سکه": "Coins",
    "ارزهای فیات": "Fiat Currencies",
    "شاخص‌ها و فلزات جهانی": "Global Indices & Metals",
    "اونس طلا (دلار)": "Gold Ounce (USD)",
    "مثقال طلا": "Gold Mithqal",
    "طلای ۱۸ عیار": "18K Gold",
    "طلای ۲۴ عیار": "24K Gold",
    "طلای آبشده": "Melted Gold",
    "طلای ۱۷ عیار": "17K Gold",
    "طلای ۷۴۰/۱۸ عیار": "740/18K Gold",
    "سکه امامی": "Emami Coin",
    "سکه بهار آزادی": "Bahar Azadi Coin",
    "نیم سکه": "Half Coin",
    "ربع سکه": "Quarter Coin",
    "سکه گرمی": "Gram Coin",
    "دلار آمریکا": "US Dollar",
    "یورو": "Euro",
    "پوند انگلیس": "British Pound",
    "درهم امارات": "UAE Dirham",
    "لیر ترکیه": "Turkish Lira",
    "یوان چین": "Chinese Yuan",
    "ین ژاپن": "Japanese Yen",
    "فرانک سوئیس": "Swiss Franc",
    "دلار کانادا": "Canadian Dollar",
    "دلار استرالیا": "Australian Dollar",
    "روبل روسیه": "Russian Ruble",
    "روپیه هند": "Indian Rupee",
    "دینار عراق": "Iraqi Dinar",
    "افغانی افغانستان": "Afghan Afghani",
    "ریال عربستان": "Saudi Riyal",
    "دینار کویت": "Kuwaiti Dinar",
    "ریال قطر": "Qatari Riyal",
    "ریال عمان": "Omani Rial",
    "دینار بحرین": "Bahraini Dinar",
    "کرون سوئد": "Swedish Krona",
    "کرون نروژ": "Norwegian Krone",
    "کرون دانمارک": "Danish Krone",
    "رینگیت مالزی": "Malaysian Ringgit",
    "بات تایلند": "Thai Baht",
    "دلار هنگ کنگ": "Hong Kong Dollar",
    "دلار سنگاپور": "Singapore Dollar",
    "درام ارمنستان": "Armenian Dram",
    "منات آذربایجان": "Azerbaijani Manat",
    "لاری گرجستان": "Georgian Lari",
    "نفت خام WTI (دلار)": "WTI Crude Oil (USD)",
    "نفت برنت (دلار)": "Brent Oil (USD)",
    "نقره جهانی (دلار)": "Global Silver (USD)",
    "پلاتین جهانی (دلار)": "Global Platinum (USD)",
    "پالادیوم جهانی (دلار)": "Global Palladium (USD)",
};

// Short tags shown in the top bar next to each pinned price.
export const SHORT_NAMES = {
    "دلار آمریکا": "USD",
    "یورو": "EUR",
    "پوند انگلیس": "GBP",
    "درهم امارات": "AED",
    "لیر ترکیه": "TRY",
    "یوان چین": "CNY",
    "ین ژاپن": "JPY",
    "طلای ۱۸ عیار": "18K",
    "طلای ۲۴ عیار": "24K",
    "طلای ۱۷ عیار": "17K",
    "طلای آبشده": "Melt",
    "مثقال طلا": "Mithqal",
    "اونس طلا (دلار)": "XAU",
    "سکه امامی": "Emami",
    "سکه بهار آزادی": "Bahar",
    "نیم سکه": "Half",
    "ربع سکه": "Quarter",
    "سکه گرمی": "Gram",
    "نفت خام WTI (دلار)": "WTI",
    "نفت برنت (دلار)": "Brent",
    "نقره جهانی (دلار)": "XAG",
    "پلاتین جهانی (دلار)": "XPT",
    "پالادیوم جهانی (دلار)": "XPD",
};

export const STRINGS = {
    en: {
        search: 'Search market…',
        loading: 'Loading prices…',
        refreshing: 'Refreshing…',
        updated: 'Updated %s',
        offline: 'Offline · last update %s',
        noData: "Couldn't load prices",
        noDataHint: 'Check your connection and try again.',
        retry: 'Try again',
        noResults: 'No matches for “%s”',
        copied: 'Copied ✓',
        hint: 'Click a price to copy · ☆ to pin to the top bar',
        pinLimit: 'You can pin up to %d items — unpin one first',
        pinned: 'Pinned to top bar',
        pinEmpty: 'Tap ☆ on any item to pin it here',
        refresh: 'Refresh',
        settings: 'Settings',
        // preferences
        prefGeneral: 'General',
        prefRefresh: 'Refresh interval',
        prefRefreshSub: 'Minutes between automatic updates',
        prefLanguage: 'Language',
        prefLanguageSub: 'Names of items and categories',
        prefCompact: 'Compact numbers in top bar',
        prefCompactSub: 'Show 5.12M instead of 5,123,000',
        prefTrend: 'Trend arrows in top bar',
        prefPinned: 'Pinned items',
        prefPinnedSub: 'Shown in the top bar. Pin more with ☆ in the menu.',
        prefPinnedEmpty: 'Nothing pinned yet',
        prefRemove: 'Unpin',
        prefAbout: 'About',
        prefDeveloper: 'Developer',
        prefWebsite: 'Website',
        prefSource: 'Source code',
    },
    fa: {
        search: 'جستجو در بازار…',
        loading: 'در حال دریافت قیمت‌ها…',
        refreshing: 'در حال به‌روزرسانی…',
        updated: 'به‌روزرسانی: %s',
        offline: 'آفلاین · آخرین به‌روزرسانی %s',
        noData: 'دریافت قیمت‌ها ممکن نشد',
        noDataHint: 'اتصال اینترنت را بررسی و دوباره تلاش کنید.',
        retry: 'تلاش دوباره',
        noResults: 'نتیجه‌ای برای «%s» نبود',
        copied: 'کپی شد ✓',
        hint: 'برای کپی روی قیمت کلیک کنید · ☆ برای سنجاق در نوار بالا',
        pinLimit: 'حداکثر %d مورد قابل سنجاق است — ابتدا یکی را بردارید',
        pinned: 'سنجاق‌شده در نوار بالا',
        pinEmpty: 'روی ☆ هر مورد بزنید تا اینجا سنجاق شود',
        refresh: 'به‌روزرسانی',
        settings: 'تنظیمات',
        prefGeneral: 'عمومی',
        prefRefresh: 'فاصله به‌روزرسانی',
        prefRefreshSub: 'تعداد دقیقه بین به‌روزرسانی‌های خودکار',
        prefLanguage: 'زبان',
        prefLanguageSub: 'نام آیتم‌ها و دسته‌ها',
        prefCompact: 'اعداد فشرده در نوار بالا',
        prefCompactSub: 'نمایش 5.12M به‌جای 5,123,000',
        prefTrend: 'فلش روند در نوار بالا',
        prefPinned: 'موارد سنجاق‌شده',
        prefPinnedSub: 'در نوار بالا نمایش داده می‌شوند. با ☆ در منو بیشتر سنجاق کنید.',
        prefPinnedEmpty: 'هنوز چیزی سنجاق نشده',
        prefRemove: 'برداشتن',
        prefAbout: 'درباره',
        prefDeveloper: 'توسعه‌دهنده',
        prefWebsite: 'وب‌سایت',
        prefSource: 'سورس کد',
    },
};

export function tr(lang, id, ...args) {
    let s = (STRINGS[lang] ?? STRINGS.en)[id] ?? STRINGS.en[id] ?? id;
    for (const a of args)
        s = s.replace(/%[sd]/, String(a));
    return s;
}

export const makeKey = (category, item) => `${category}|${item}`;

export function splitKey(key) {
    const i = key.indexOf('|');
    return i < 0 ? ['', key] : [key.slice(0, i), key.slice(i + 1)];
}

export function displayName(lang, faName) {
    return lang === 'fa' ? faName : (TRANSLATIONS[faName] ?? faName);
}

export function shortName(faItem) {
    return SHORT_NAMES[faItem] ?? (TRANSLATIONS[faItem] ?? faItem).slice(0, 8);
}

// Convert Persian / Arabic-Indic digits and separators to ASCII.
export function normalizeDigits(str) {
    return String(str)
        .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x06F0))
        .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x0660))
        .replace(/٫/g, '.')
        .replace(/[٬،,\s]/g, '');
}

// Returns a finite number, or 0 when the value can't be parsed.
export function parseNumber(value) {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : 0;
    const cleaned = normalizeDigits(value).replace(/[^0-9.\-]/g, '');
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
}

export function formatNumber(num, lang = 'en', compact = false) {
    if (!Number.isFinite(num) || num === 0)
        return '---';
    const locale = lang === 'fa' ? 'fa-IR' : 'en-US';
    if (compact) {
        const abs = Math.abs(num);
        let scaled = null;
        if (abs >= 1e9)
            scaled = [num / 1e9, 'B', 2];
        else if (abs >= 1e6)
            scaled = [num / 1e6, 'M', 2];
        else if (abs >= 1e5)
            scaled = [num / 1e3, 'K', 0];
        if (scaled) {
            return new Intl.NumberFormat(locale, {
                minimumFractionDigits: scaled[2],
                maximumFractionDigits: scaled[2],
            }).format(scaled[0]) + scaled[1];
        }
    }
    return new Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(num);
}

// {cur, prev} -> {arrow, cls, pct}. prev === 0 means "unknown".
export function trendOf(cur, prev) {
    if (!prev || !cur || cur === prev)
        return {arrow: '–', cls: 'trend-neutral', pct: null};
    const pct = ((cur - prev) / prev) * 100;
    return cur > prev
        ? {arrow: '▲', cls: 'trend-up', pct}
        : {arrow: '▼', cls: 'trend-down', pct};
}

export function formatPercent(pct, lang = 'en') {
    if (pct === null || pct === undefined)
        return '';
    const sign = pct > 0 ? '+' : '';
    const text = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(pct);
    return `${sign}${text}%`;
}
