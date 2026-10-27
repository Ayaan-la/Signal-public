// ===== ইন্ডিকেটর আর সংকেতের হিসাব =====
function emaSeries(values, period) {
  const k = 2 / (period + 1);
  const out = [];
  let e = values[0];
  for (let i = 0; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

function rsiValue(values, period) {
  if (values.length <= period) return 50;
  const gains = [], losses = [];
  for (let i = 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gains.push(Math.max(d, 0));
    losses.push(Math.max(-d, 0));
  }
  let ag = 0, al = 0;
  for (let i = 0; i < period; i++) { ag += gains[i]; al += losses[i]; }
  ag /= period; al /= period;
  for (let i = period; i < gains.length; i++) {
    ag = (ag * (period - 1) + gains[i]) / period;
    al = (al * (period - 1) + losses[i]) / period;
  }
  if (al === 0) return 100;
  return 100 - 100 / (1 + ag / al);
}

function analyze(cs) {
  if (cs.length < 40) return null;
  const closes = cs.map(function (c) { return c.c; });
  const close = closes[closes.length - 1];
  const last = cs[cs.length - 1], prev = cs[cs.length - 2];
  let score = 0;
  const reasons = [];

  // ১) EMA
  const ef = emaSeries(closes, EMA_FAST).slice(-1)[0];
  const es = emaSeries(closes, EMA_SLOW).slice(-1)[0];
  if (ef > es) { score += 1; reasons.push('📈 EMA: ছোট গড় বড় গড়ের উপরে, ট্রেন্ড উপরের দিকে (+১)'); }
  else { score -= 1; reasons.push('📉 EMA: ছোট গড় বড় গড়ের নিচে, ট্রেন্ড নিচের দিকে (−১)'); }

  // ২) MACD
  const e12 = emaSeries(closes, 12), e26 = emaSeries(closes, 26);
  const macd = e12.map(function (v, i) { return v - e26[i]; });
  const sig = emaSeries(macd, 9);
  const n = macd.length;
  const hist = macd[n - 1] - sig[n - 1];
  const histPrev = macd[n - 2] - sig[n - 2];
  if (hist > 0) {
    score += 1;
    reasons.push('📈 MACD: পজিটিভ' + (hist > histPrev ? ', আর বাড়ছে' : ', তবে কমছে') + ' (+১)');
  } else if (hist < 0) {
    score -= 1;
    reasons.push('📉 MACD: নেগেটিভ' + (hist < histPrev ? ', আর বাড়ছে' : ', তবে কমছে') + ' (−১)');
  } else {
    reasons.push('➖ MACD: নিরপেক্ষ (০)');
  }

  // ৩) RSI
  const r = rsiValue(closes, 14);
  if (r < 30) { score += 1; reasons.push('📈 RSI ' + r.toFixed(1) + ': অতিরিক্ত বিক্রি হয়েছে, দাম ফিরে উঠতে পারে (+১)'); }
  else if (r > 70) { score -= 1; reasons.push('📉 RSI ' + r.toFixed(1) + ': অতিরিক্ত কেনা হয়েছে, দাম নামতে পারে (−১)'); }
  else { reasons.push('➖ RSI ' + r.toFixed(1) + ': মাঝামাঝি, কোনো ভোট নেই (০)'); }

  // ৪) বলিঞ্জার ব্যান্ড
  const w = closes.slice(-20);
  const mean = w.reduce(function (a, b) { return a + b; }, 0) / 20;
  const sd = Math.sqrt(w.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / 20);
  const upper = mean + 2 * sd, lower = mean - 2 * sd;
  if (sd > 0 && close <= lower) { score += 1; reasons.push('📈 বলিঞ্জার: দাম নিচের সীমায় ঠেকেছে (+১)'); }
  else if (sd > 0 && close >= upper) { score -= 1; reasons.push('📉 বলিঞ্জার: দাম উপরের সীমায় ঠেকেছে (−১)'); }
  else { reasons.push('➖ বলিঞ্জার: সীমার ভেতরে (০)'); }

  // ৫) স্টোকাস্টিক
  const last14 = cs.slice(-14);
  const hh = Math.max.apply(null, last14.map(function (c) { return c.h; }));
  const ll = Math.min.apply(null, last14.map(function (c) { return c.l; }));
  const stoch = hh > ll ? (close - ll) / (hh - ll) * 100 : 50;
  if (stoch < 20) { score += 1; reasons.push('📈 স্টোকাস্টিক ' + stoch.toFixed(0) + ': নিচু এলাকায় (+১)'); }
  else if (stoch > 80) { score -= 1; reasons.push('📉 স্টোকাস্টিক ' + stoch.toFixed(0) + ': উঁচু এলাকায় (−১)'); }
  else { reasons.push('➖ স্টোকাস্টিক ' + stoch.toFixed(0) + ': মাঝামাঝি (০)'); }

  // ৬) ক্যান্ডেল প্যাটার্ন
  const body = Math.abs(last.c - last.o);
  const tiny = (last.h - last.l) * 0.05 + 1e-12;
  const bodyN = Math.max(body, tiny);
  const upperSh = last.h - Math.max(last.o, last.c);
  const lowerSh = Math.min(last.o, last.c) - last.l;
  let pattern = null;
  if (prev.c < prev.o && last.c > last.o && last.o <= prev.c && last.c >= prev.o)
    pattern = [1, 'বুলিশ এনগালফিং (আগের লাল ক্যান্ডেল ঢেকে দিয়েছে)'];
  else if (prev.c > prev.o && last.c < last.o && last.o >= prev.c && last.c <= prev.o)
    pattern = [-1, 'বেয়ারিশ এনগালফিং (আগের সবুজ ক্যান্ডেল ঢেকে দিয়েছে)'];
  else if (lowerSh >= 2 * bodyN && upperSh <= bodyN * 0.7)
    pattern = [1, 'হ্যামার (নিচে লম্বা ছায়া)'];
  else if (upperSh >= 2 * bodyN && lowerSh <= bodyN * 0.7)
    pattern = [-1, 'শুটিং স্টার (উপরে লম্বা ছায়া)'];
  if (pattern) {
    score += pattern[0];
    reasons.push((pattern[0] > 0 ? '📈' : '📉') + ' ক্যান্ডেল: ' + pattern[1] + ' (' + (pattern[0] > 0 ? '+১' : '−১') + ')');
  } else {
    reasons.push('➖ ক্যান্ডেল: বিশেষ প্যাটার্ন নেই (০)');
  }

  // ATR
  let atr = 0;
  for (let i = cs.length - 14; i < cs.length; i++) {
    const h = cs[i].h, l = cs[i].l, pc = cs[i - 1].c;
    atr += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  atr /= 14;

  const code = score >= MIN_SCORE ? 'BUY' : score <= -MIN_SCORE ? 'SELL' : 'WAIT';
  return {
    code: code, score: score, confidence: Math.round(Math.abs(score) / 6 * 100), reasons: reasons,
    ind: { ema_fast: ef, ema_slow: es, rsi: r, macd_hist: hist, stoch: stoch, atr: atr }
  };
}
