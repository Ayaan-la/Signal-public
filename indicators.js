// ===== Indicators and signal logic =====
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

// Takes a list of candles and returns a signal with the reason behind each vote.
function analyze(cs) {
  if (cs.length < 40) return null;
  const closes = cs.map(function (c) { return c.c; });
  const close = closes[closes.length - 1];
  const last = cs[cs.length - 1], prev = cs[cs.length - 2];
  const votes = [];
  let score = 0;
  function vote(name, v, text) { score += v; votes.push({ name: name, vote: v, text: text }); }

  // 1) EMA trend
  const ef = emaSeries(closes, EMA_FAST).slice(-1)[0];
  const es = emaSeries(closes, EMA_SLOW).slice(-1)[0];
  if (ef > es) vote('EMA trend', 1, 'Fast EMA is above slow EMA (uptrend)');
  else vote('EMA trend', -1, 'Fast EMA is below slow EMA (downtrend)');

  // 2) MACD
  const e12 = emaSeries(closes, 12), e26 = emaSeries(closes, 26);
  const macd = e12.map(function (v, i) { return v - e26[i]; });
  const sig = emaSeries(macd, 9);
  const n = macd.length;
  const hist = macd[n - 1] - sig[n - 1];
  const histPrev = macd[n - 2] - sig[n - 2];
  if (hist > 0) vote('MACD', 1, 'Histogram positive and ' + (hist > histPrev ? 'rising' : 'fading'));
  else if (hist < 0) vote('MACD', -1, 'Histogram negative and ' + (hist < histPrev ? 'falling' : 'recovering'));
  else vote('MACD', 0, 'Histogram is flat');

  // 3) RSI
  const r = rsiValue(closes, 14);
  if (r < 30) vote('RSI', 1, 'RSI ' + r.toFixed(1) + ': oversold, a bounce is possible');
  else if (r > 70) vote('RSI', -1, 'RSI ' + r.toFixed(1) + ': overbought, a pullback is possible');
  else vote('RSI', 0, 'RSI ' + r.toFixed(1) + ': neutral zone');

  // 4) Bollinger Bands
  const w = closes.slice(-20);
  const mean = w.reduce(function (a, b) { return a + b; }, 0) / 20;
  const sd = Math.sqrt(w.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / 20);
  const upper = mean + 2 * sd, lower = mean - 2 * sd;
  if (sd > 0 && close <= lower) vote('Bollinger', 1, 'Price is at the lower band');
  else if (sd > 0 && close >= upper) vote('Bollinger', -1, 'Price is at the upper band');
  else vote('Bollinger', 0, 'Price is inside the bands');

  // 5) Stochastic
  const last14 = cs.slice(-14);
  const hh = Math.max.apply(null, last14.map(function (c) { return c.h; }));
  const ll = Math.min.apply(null, last14.map(function (c) { return c.l; }));
  const stoch = hh > ll ? (close - ll) / (hh - ll) * 100 : 50;
  if (stoch < 20) vote('Stochastic', 1, 'Stochastic ' + stoch.toFixed(0) + ': low zone');
  else if (stoch > 80) vote('Stochastic', -1, 'Stochastic ' + stoch.toFixed(0) + ': high zone');
  else vote('Stochastic', 0, 'Stochastic ' + stoch.toFixed(0) + ': mid zone');

  // 6) Candle pattern
  const body = Math.abs(last.c - last.o);
  const tiny = (last.h - last.l) * 0.05 + 1e-12;
  const bodyN = Math.max(body, tiny);
  const upperSh = last.h - Math.max(last.o, last.c);
  const lowerSh = Math.min(last.o, last.c) - last.l;
  if (prev.c < prev.o && last.c > last.o && last.o <= prev.c && last.c >= prev.o)
    vote('Candle', 1, 'Bullish engulfing');
  else if (prev.c > prev.o && last.c < last.o && last.o >= prev.c && last.c <= prev.o)
    vote('Candle', -1, 'Bearish engulfing');
  else if (lowerSh >= 2 * bodyN && upperSh <= bodyN * 0.7)
    vote('Candle', 1, 'Hammer (long lower shadow)');
  else if (upperSh >= 2 * bodyN && lowerSh <= bodyN * 0.7)
    vote('Candle', -1, 'Shooting star (long upper shadow)');
  else
    vote('Candle', 0, 'No notable pattern');

  // ATR (shown for volatility only)
  let atr = 0;
  for (let i = cs.length - 14; i < cs.length; i++) {
    const h = cs[i].h, l = cs[i].l, pc = cs[i - 1].c;
    atr += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  atr /= 14;

  const need = settings.minScore;
  const code = score >= need ? 'BUY' : score <= -need ? 'SELL' : 'WAIT';
  return {
    code: code, score: score, confidence: Math.round(Math.abs(score) / 6 * 100), votes: votes,
    ind: { ema_fast: ef, ema_slow: es, rsi: r, macd_hist: hist, stoch: stoch, atr: atr }
  };
}
