// ===== Configuration =====
// Change the app name here (also edit manifest.json and the <title> in index.html)
const APP_NAME = 'Pulse Signals';

const WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public';

const MARKETS = [
  { group: 'Forex', items: [
    ['frxEURUSD', 'EUR/USD'], ['frxGBPUSD', 'GBP/USD'], ['frxUSDJPY', 'USD/JPY'],
    ['frxAUDUSD', 'AUD/USD'], ['frxUSDCAD', 'USD/CAD'], ['frxUSDCHF', 'USD/CHF'],
    ['frxNZDUSD', 'NZD/USD'], ['frxEURGBP', 'EUR/GBP'], ['frxEURJPY', 'EUR/JPY'],
    ['frxGBPJPY', 'GBP/JPY']
  ] },
  { group: 'Commodities', items: [['frxXAUUSD', 'Gold (XAU/USD)'], ['frxXAGUSD', 'Silver (XAG/USD)']] },
  { group: 'Crypto', items: [['cryBTCUSD', 'Bitcoin (BTC/USD)'], ['cryETHUSD', 'Ethereum (ETH/USD)']] },
  { group: 'Synthetic', items: [
    ['R_10', 'Volatility 10'], ['R_25', 'Volatility 25'], ['R_50', 'Volatility 50'],
    ['R_75', 'Volatility 75'], ['R_100', 'Volatility 100']
  ] }
];

// [seconds, label]
const TIMEFRAMES = [[60, '1m'], [180, '3m'], [300, '5m'], [900, '15m']];

const HISTORY_COUNT = 1000;   // candles used for the backtest
const WINDOW = 60;            // candles used for each analysis
const EMA_FAST = 9;
const EMA_SLOW = 21;
const ENTRY_WINDOW = 10;      // seconds before candle close when the final call is shown

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

const DEFAULTS = { symbol: 'frxEURUSD', tf: 60, voice: false, payout: 90, minScore: 2 };
let settings = Object.assign({}, DEFAULTS, lsGet('pulse_settings', {}));

function allSymbols() {
  const out = [];
  MARKETS.forEach(function (g) { g.items.forEach(function (i) { out.push(i); }); });
  return out;
}
if (!allSymbols().some(function (s) { return s[0] === settings.symbol; })) settings.symbol = DEFAULTS.symbol;
if (!TIMEFRAMES.some(function (t) { return t[0] === settings.tf; })) settings.tf = DEFAULTS.tf;

const SYMBOL = settings.symbol;
const TF = settings.tf;

function saveSettings() { lsSet('pulse_settings', settings); }
function marketName(sym) {
  const f = allSymbols().filter(function (s) { return s[0] === sym; })[0];
  return f ? f[1] : sym;
}
function tfName(tf) {
  const f = TIMEFRAMES.filter(function (t) { return t[0] === tf; })[0];
  return f ? f[1] : tf + 's';
}
function payoutRate() { return settings.payout / 100; }
function breakEven() { return Math.round(100 / (1 + payoutRate()) * 10) / 10; }
