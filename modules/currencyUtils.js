const axios = require('axios');

const RATE_CACHE_TTL_MS = 1000 * 60 * 60;
const rateCache = new Map();

const COUNTRY_TO_CURRENCY = {
    NO: 'NOK',
    SE: 'SEK',
    DK: 'DKK',
    FI: 'EUR',
    IS: 'ISK',
    GB: 'GBP',
    IE: 'EUR',
    FR: 'EUR',
    DE: 'EUR',
    ES: 'EUR',
    PT: 'EUR',
    IT: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
    CH: 'CHF',
    AT: 'EUR',
    PL: 'PLN',
    CZ: 'CZK',
    HU: 'HUF',
    RO: 'RON',
    BG: 'BGN',
    HR: 'EUR',
    US: 'USD',
    CA: 'CAD',
    MX: 'MXN',
    BR: 'BRL',
    AR: 'ARS',
    CL: 'CLP',
    CO: 'COP',
    PE: 'PEN',
    AU: 'AUD',
    NZ: 'NZD',
    JP: 'JPY',
    KR: 'KRW',
    CN: 'CNY',
    IN: 'INR',
    PK: 'PKR',
    BD: 'BDT',
    LK: 'LKR',
    ID: 'IDR',
    MY: 'MYR',
    SG: 'SGD',
    TH: 'THB',
    PH: 'PHP',
    VN: 'VND',
    HK: 'HKD',
    TW: 'TWD',
    AE: 'AED',
    SA: 'SAR',
    QA: 'QAR',
    KW: 'KWD',
    BH: 'BHD',
    OM: 'OMR',
    ZA: 'ZAR',
    NG: 'NGN',
    EG: 'EGP',
    KE: 'KES',
    MA: 'MAD',
    TR: 'TRY',
    RU: 'RUB',
    UA: 'UAH',
};

function normalizeCurrency(value, fallback = 'NOK') {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) return fallback;
    return raw.replace(/[^A-Z]/g, '').slice(0, 3) || fallback;
}

function getCurrencyFromCountry(countryCode, fallback = 'NOK') {
    const code = String(countryCode || '').trim().toUpperCase();
    if (!code || code === 'XX' || code === 'T1') return fallback;
    return COUNTRY_TO_CURRENCY[code] || fallback;
}

function buildCacheKey(fromCurrency, toCurrency) {
    return `${fromCurrency}->${toCurrency}`;
}

async function fetchExchangeRate(fromCurrency, toCurrency) {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency, from);

    if (from === to) return 1;

    const cacheKey = buildCacheKey(from, to);
    const now = Date.now();
    const cached = rateCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cached.rate;
    }

    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const response = await axios.get(url, { timeout: 5000 });
    const rate = Number(response?.data?.rates?.[to]);

    if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Invalid exchange rate for ${cacheKey}`);
    }

    rateCache.set(cacheKey, {
        rate,
        expiresAt: now + RATE_CACHE_TTL_MS,
    });

    return rate;
}

async function convertAmount(amount, fromCurrency, toCurrency) {
    const baseAmount = Number(amount);
    if (!Number.isFinite(baseAmount) || baseAmount < 0) {
        return null;
    }

    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency, from);
    if (from === to) return baseAmount;

    try {
        const rate = await fetchExchangeRate(from, to);
        return baseAmount * rate;
    } catch (error) {
        console.error('Currency conversion failed:', error.message);
        return null;
    }
}

module.exports = {
    normalizeCurrency,
    getCurrencyFromCountry,
    convertAmount,
};
