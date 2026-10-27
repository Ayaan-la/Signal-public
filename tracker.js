// ===== লাইভ জেতা-হারার রেকর্ড =====
function symResults() { return results.filter(function (r) { return r.symbol === SYMBOL; }); }
function liveStats() {
  const rs = symResults();
  const w = rs.filter(function (r) { return r.result === 'WIN'; }).length;
  const l = rs.filter(function (r) { return r.result === 'LOSS'; }).length;
  const d = rs.filter(function (r) { return r.result === 'DRAW'; }).length;
  return { wins: w, losses: l, draws: d, rate: (w + l) ? Math.round(w / (w + l) * 1000) / 10 : 0 };
}

// প্রতিটা নতুন টিকে চলমান ট্রেডগুলো মেলানো (সার্ভারের সময় ধরে, তাই নির্ভুল)
function trackerOnTick(price, epoch) {
  const keep = [];
  pending.forEach(function (p) {
    if (p.symbol !== SYMBOL) return;
    if (p.entry === null) {
      if (epoch >= p.open_at) {
        if (epoch - p.open_at > 20) return;      // দেরিতে টিক এসেছে, বাতিল
        p.entry = price;
      }
    } else if (epoch >= p.close_at) {
      if (epoch - p.close_at > 20) return;       // দেরিতে টিক এসেছে, বাতিল
      let res;
      if (price === p.entry) res = 'DRAW';
      else res = ((p.signal === 'BUY') === (price > p.entry)) ? 'WIN' : 'LOSS';
      results.push({ time: p.open_at, symbol: p.symbol, signal: p.signal, entry: p.entry, exit: price, result: res });
      results = results.slice(-300);
      lsSet('sb_results', results);
      return;
    }
    keep.push(p);
  });
  pending = keep;
}

// প্রতি মিনিটের ৫০ সেকেন্ডে সংকেত নেওয়া
let lastMinute = null;
setInterval(function () {
  const now = nowSec();
  const minute = Math.floor(now / 60) * 60;
  const fresh = Date.now() - lastTickLocal < 15000;
  if (now % 60 >= 50 && lastMinute !== minute && fresh) {
    lastMinute = minute;
    const a = analyze(candles.slice(-WINDOW));
    if (a && a.code !== 'WAIT') {
      pending.push({ signal: a.code, open_at: minute + 60, close_at: minute + 120, entry: null, symbol: SYMBOL });
    }
  }
  // অনেক পুরোনো হয়ে যাওয়া ট্রেড ফেলে দেওয়া
  pending = pending.filter(function (p) { return now < p.close_at + 30; });
}, 500);
