// ===== অ্যাপের চলমান অবস্থা (সব ফাইল এটা ব্যবহার করে) =====
let candles = [];
let pending = [];
let results = lsGet('sb_results', []);
let status = 'কানেক্ট হচ্ছে...';
let backtest = null;
let clockOffset = 0;      // সার্ভারের সময় - ফোনের সময় (সেকেন্ড)
let lastTickLocal = 0;
let ws = null;
let pingTimer = null;
let reconnectTimer = null;
let offsetSamples = [];   // সময়ের ফারাকের সাম্প্রতিক নমুনা

function nowSec() { return Date.now() / 1000 + clockOffset; }
