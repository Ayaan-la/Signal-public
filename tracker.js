// ===== Live record: tracks every final call and checks the outcome =====
function symResults() {
  return results.filter(function (r) { return r.symbol === SYMBOL && (r.tf || 60) === TF; });
}

function liveStats() {
  const rs = symResults();
  const w = rs.filter(function (r) { return r.result === 'WIN'; }).length;
  const l = rs.filter(function (r) { return r.result === 'LOSS'; }).length;
  const d = rs.filter(function (r) { return r.result === 'DRAW'; }).length;
  return { wins: w, losses: l, draws: d, total: w + l + d, rate: (w + l) ? Math.round(w / (w + l) * 1000) / 10 : 0 };
}

function resetRecord() {
  results = results.filter(function (r) { return !(r.symbol === SYMBOL && (r.tf || 60) === TF); });
  lsSet('sb_results', results);
}

// Runs on every tick. Uses server time so the entry and exit prices are accurate.
function trackerOnTick(price, epoch) {
  const keep = [];
  pending.forEach(function (p) {
    if (p.symbol !== SYMBOL || p.tf !== TF) return;
    if (p.entry === null) {
      if (epoch >= p.open_at) {
        if (epoch - p.open_at > 20) return;       // tick arrived too late, discard
        p.entry = price;
      }
    } else if (epoch >= p.close_at) {
      if (epoch - p.close_at > 20) return;        // tick arrived too late, discard
      let res;
      if (price === p.entry) res = 'DRAW';
      else res = ((p.signal === 'BUY') === (price > p.entry)) ? 'WIN' : 'LOSS';
      results.push({ time: p.open_at, symbol: p.symbol, tf: p.tf, signal: p.signal, entry: p.entry, exit: price, result: res });
      results = results.slice(-300);
      lsSet('sb_results', results);
      return;
    }
    keep.push(p);
  });
  pending = keep;
}

// Takes the final call shortly before each candle closes.
let lastBucket = null;
setInterval(function () {
  const now = nowSec();
  const bucket = Math.floor(now / TF) * TF;
  const fresh = Date.now() - lastTickLocal < 15000;
  if (now % TF >= TF - ENTRY_WINDOW && lastBucket !== bucket && fresh) {
    lastBucket = bucket;
    const a = analyze(candles.slice(-WINDOW));
    if (a && a.code !== 'WAIT') {
      pending.push({ signal: a.code, tf: TF, open_at: bucket + TF, close_at: bucket + 2 * TF, entry: null, symbol: SYMBOL });
    }
  }
  pending = pending.filter(function (p) { return now < p.close_at + 30; });
}, 500);
