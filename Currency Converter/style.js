/**
 * script.js — Currency Converter
 * -------------------------------------------------
 * Uses the free ExchangeRate-API (open/latest endpoint).
 * No API key required for this endpoint.
 *
 * Features:
 *  ✔ Fetches real-time exchange rates
 *  ✔ Converts between any two currencies
 *  ✔ Swap button with spin animation
 *  ✔ Input validation with shake effect
 *  ✔ Loading / error states
 *  ✔ Animated count-up result
 *  ✔ Shows exchange rate + last updated time
 * -------------------------------------------------
 */

/* 
   1.  CONSTANTS & STATE
    */

/** Free endpoint — no key needed; returns rates relative to USD */
const API_BASE = 'https://api.exchangerate-api.com/v4/latest/';

/**
 * Full list of supported currency codes (ISO 4217).
 * Kept sorted alphabetically for usability.
 */
const CURRENCIES = [
  'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN',
  'BAM','BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BRL',
  'BSD','BTN','BWP','BYN','BZD','CAD','CDF','CHF','CLP','CNY',
  'COP','CRC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP',
  'ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD',
  'GNF','GTQ','GYD','HKD','HNL','HRK','HTG','HUF','IDR','ILS',
  'INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR',
  'KMF','KPW','KRW','KWD','KYD','KZT','LAK','LBP','LKR','LRD',
  'LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU',
  'MUR','MVR','MWK','MXN','MYR','MZN','NAD','NGN','NIO','NOK',
  'NPR','NZD','OMR','PAB','PEN','PGK','PHP','PKR','PLN','PYG',
  'QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK',
  'SGD','SHP','SLL','SOS','SRD','STN','SVC','SYP','SZL','THB',
  'TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX',
  'USD','UYU','UZS','VES','VND','VUV','WST','XAF','XCD','XOF',
  'XPF','YER','ZAR','ZMW','ZWL'
];

/** Default currencies shown on load */
const DEFAULT_FROM = 'USD';
const DEFAULT_TO   = 'INR';

/** Cache: avoid re-fetching the same base within a session */
const ratesCache = {};

/* 
   2.  DOM REFERENCES
    */
const amountInput     = document.getElementById('amount');
const fromSelect      = document.getElementById('from-currency');
const toSelect        = document.getElementById('to-currency');
const convertBtn      = document.getElementById('convert-btn');
const swapBtn         = document.getElementById('swap-btn');
const resultPanel     = document.getElementById('result-panel');
const rateBar         = document.getElementById('rate-bar');
const amountError     = document.getElementById('amount-error');

/* 
   3.  INITIALISATION
    */

/**
 * Populate both <select> dropdowns with currency options.
 * Sets defaults (USD → INR) and triggers an initial conversion.
 */
function init() {
  CURRENCIES.forEach(code => {
    const optFrom = new Option(code, code);
    const optTo   = new Option(code, code);
    fromSelect.add(optFrom);
    toSelect.add(optTo);
  });

  fromSelect.value = DEFAULT_FROM;
  toSelect.value   = DEFAULT_TO;

  // Auto-convert on load
  convertCurrency();
}

/* 
   4.  VALIDATION
    */

/**
 * Validate the amount input field.
 * @returns {number|null}  Parsed numeric value, or null if invalid.
 */
function validateAmount() {
  const raw   = amountInput.value.trim();
  const value = parseFloat(raw);

  if (raw === '' || isNaN(value)) {
    showAmountError('Please enter a valid number.');
    return null;
  }
  if (value < 0) {
    showAmountError('Amount must be a positive number.');
    return null;
  }
  clearAmountError();
  return value;
}

function showAmountError(msg) {
  amountError.textContent = msg;
  amountInput.classList.add('error');
}

function clearAmountError() {
  amountError.textContent = '';
  amountInput.classList.remove('error');
}

/* 
   5.  FETCH EXCHANGE RATES
    */

/**
 * Fetch rates from the API for a given base currency.
 * Results are cached in `ratesCache` to reduce network calls.
 * @param {string} base  ISO 4217 currency code.
 * @returns {Promise<{rates: Object, time_last_update_utc: string}>}
 */
async function fetchRates(base) {
  if (ratesCache[base]) {
    console.log(`[Cache] Using cached rates for ${base}`);
    return ratesCache[base];
  }

  const url = `${API_BASE}${base}`;
  console.log(`[API] Fetching: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.rates) {
    throw new Error('Unexpected API response — no rates object found.');
  }

  // Cache by base currency
  ratesCache[base] = data;
  return data;
}

/* 
   6.  CORE CONVERSION LOGIC
    */

/**
 * Main conversion handler — called on button click.
 * 1. Validates input
 * 2. Fetches rates (with caching)
 * 3. Calculates result
 * 4. Renders result with animation
 */
async function convertCurrency() {
  const amount = validateAmount();
  if (amount === null) return;

  const fromCode = fromSelect.value;
  const toCode   = toSelect.value;

  // Set loading state
  setLoading(true);
  hideResult();

  try {
    const data        = await fetchRates(fromCode);
    const rates       = data.rates;
    const updatedTime = data.time_last_update_utc || 'Unknown';

    // Validate that target currency is in the rates
    if (!(toCode in rates)) {
      throw new Error(`Exchange rate for ${toCode} is not available.`);
    }

    const rate          = rates[toCode];
    const convertedAmt  = amount * rate;

    // Render success
    showResult(convertedAmt, toCode, amount, fromCode, rate, updatedTime);

  } catch (err) {
    console.error('[Converter Error]', err);
    showError(err.message || 'Failed to fetch rates. Please try again.');
  } finally {
    setLoading(false);
  }
}

/* 
   7.  UI  STATE HELPERS
   */

/**
 * Toggle the loading state on the convert button.
 * @param {boolean} loading
 */
function setLoading(loading) {
  if (loading) {
    convertBtn.classList.add('loading');
    convertBtn.disabled = true;
  } else {
    convertBtn.classList.remove('loading');
    convertBtn.disabled = false;
  }
}

/** Hide result panel and rate bar */
function hideResult() {
  resultPanel.classList.remove('visible', 'error-state');
  rateBar.classList.remove('visible');
  resultPanel.innerHTML = '';
  rateBar.innerHTML     = '';
}

/**
 * Render the converted result with a count-up animation.
 * @param {number} convertedAmt
 * @param {string} toCode
 * @param {number} originalAmt
 * @param {string} fromCode
 * @param {number} rate
 * @param {string} updatedTime
 */
function showResult(convertedAmt, toCode, originalAmt, fromCode, rate, updatedTime) {
  // ── Result Panel HTML ──
  resultPanel.innerHTML = `
    <div class="result-inner">
      <div class="result-label">Converted Amount</div>
      <div class="result-amount" id="result-amount-val">0</div>
      <div class="result-currency">
        ${formatNumber(originalAmt)} ${fromCode}
        <span style="color: var(--gold-500); margin: 0 4px;">→</span>
        ${toCode}
      </div>
    </div>
  `;

  // ── Rate Bar HTML ──
  const formattedRate = rate >= 0.0001
    ? rate.toFixed(6).replace(/\.?0+$/, '')   // trim trailing zeros
    : rate.toExponential(4);

  const reverseRate = (1 / rate).toFixed(6).replace(/\.?0+$/, '');

  // Format the last-updated string
  const lastUpdated = formatUpdatedTime(updatedTime);

  rateBar.innerHTML = `
    <div class="rate-row">
      <span>Exchange Rate</span>
      <span class="rate-badge">1 ${fromCode} = ${formattedRate} ${toCode}</span>
    </div>
    <div class="rate-row">
      <span>Inverse Rate</span>
      <span class="rate-value">1 ${toCode} = ${reverseRate} ${fromCode}</span>
    </div>
    <div class="rate-row">
      <span>Rates updated</span>
      <span class="rate-value">${lastUpdated}</span>
    </div>
  `;

  // ── Show panels ──
  resultPanel.classList.add('visible');
  rateBar.classList.add('visible');

  // ── Animate count-up ──
  animateCountUp(0, convertedAmt, document.getElementById('result-amount-val'), toCode);
}

/**
 * Display an error inside the result panel.
 * @param {string} message
 */
function showError(message) {
  resultPanel.innerHTML = `
    <div class="result-inner">
      <div class="result-label">Error</div>
      <div class="result-amount">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:1.3rem; margin-right:6px;"></i>
        ${message}
      </div>
    </div>
  `;
  resultPanel.classList.add('visible', 'error-state');
}

/* 
   8.  COUNT-UP ANIMATION
    */

/**
 * Animates a number from `start` to `end` over ~900ms.
 * Uses requestAnimationFrame for smooth 60fps animation.
 * @param {number} start
 * @param {number} end
 * @param {HTMLElement} el       Target element to update.
 * @param {string} currencyCode  Appended after the number.
 */
function animateCountUp(start, end, el, currencyCode) {
  if (!el) return;

  const duration   = 900;                      // ms
  const startTime  = performance.now();
  const isLarge    = end > 1_000_000;
  const decimalPlaces = end < 1 ? 6 : end < 10 ? 4 : 2;

  function step(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic
    const ease     = 1 - Math.pow(1 - progress, 3);
    const current  = start + (end - start) * ease;

    el.textContent = formatNumber(current, decimalPlaces);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // Final value — ensure exact
      el.textContent = formatNumber(end, decimalPlaces);
    }
  }

  requestAnimationFrame(step);
}

/* 
   9.  UTILITY FUNCTIONS
    */

/**
 * Format a number with locale-appropriate commas.
 * @param {number} num
 * @param {number} [maxDecimals=2]
 * @returns {string}
 */
function formatNumber(num, maxDecimals = 2) {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(num);
}

/**
 * Convert the raw UTC string from the API into a friendly format.
 * Falls back to the raw string if parsing fails.
 * @param {string} rawTime  e.g. "Mon, 19 Mar 2026 00:00:01 +0000"
 * @returns {string}
 */
function formatUpdatedTime(rawTime) {
  try {
    const date = new Date(rawTime);
    if (isNaN(date)) return rawTime;
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  } catch {
    return rawTime;
  }
}

/* 
   10.  EVENT LISTENERS
 */

/** Convert on button click */
convertBtn.addEventListener('click', convertCurrency);

/** Convert on Enter key */
amountInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') convertCurrency();
});

/** Clear error as user types */
amountInput.addEventListener('input', () => {
  if (amountInput.classList.contains('error')) clearAmountError();
});

/**
 * Swap the "from" and "to" currencies.
 * Triggers a new conversion automatically.
 */
swapBtn.addEventListener('click', () => {
  const temp        = fromSelect.value;
  fromSelect.value  = toSelect.value;
  toSelect.value    = temp;

  // Spin animation
  swapBtn.classList.add('spinning');
  swapBtn.addEventListener('animationend', () => {
    swapBtn.classList.remove('spinning');
  }, { once: true });

  convertCurrency();
});

/** Re-convert whenever either currency changes */
fromSelect.addEventListener('change', convertCurrency);
toSelect.addEventListener('change', convertCurrency);

/* ............
   11.  BOOT */
init();