// ===== Shared runtime state =====
let candles = [];
let pending = [];
let results = lsGet('sb_results', []);
let backtest = null;
let status = 'Connecting...';
let clockOffset = 0;        // server time minus phone time, in seconds
let lastTickLocal = 0;
let ws = null;
let pingTimer = null;
let reconnectTimer = null;
let offsetSamples = [];

function nowSec() { return Date.now() / 1000 + clockOffset; }
