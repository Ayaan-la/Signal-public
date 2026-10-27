// ===== সেটিংস ও ছোট সাহায্যকারী ফাংশন =====
// ====================== সেটিংস ======================
const WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public';
const SYMBOLS = [
  ['frxEURUSD', 'EUR/USD'], ['frxGBPUSD', 'GBP/USD'], ['frxUSDJPY', 'USD/JPY'],
  ['frxAUDUSD', 'AUD/USD'], ['R_100', 'Volatility 100'], ['R_50', 'Volatility 50']
];
const HISTORY_COUNT = 1000;
const WINDOW = 60;
const EMA_FAST = 9, EMA_SLOW = 21;
const PAYOUT = 0.90;
const MIN_SCORE = 2;
// ====================================================

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

let SYMBOL = lsGet('sb_symbol', 'frxEURUSD');
if (!SYMBOLS.some(function (s) { return s[0] === SYMBOL; })) SYMBOL = SYMBOLS[0][0];
