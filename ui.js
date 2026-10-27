// ===== ভয়েস আর স্ক্রিনে দেখানো =====
// ---------- ভয়েস ----------
let voiceOn = false;
let spokenKey = null;
function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'bn-BD'; u.pitch = 1.7; u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
document.getElementById('vbtn').addEventListener('click', function () {
  voiceOn = !voiceOn;
  this.textContent = voiceOn ? '🔇 ভয়েস বন্ধ করো' : '🔊 ভয়েস চালু করো';
  if (voiceOn) speak('হাই! আমি তোমার সিগন্যাল সহকারী। কেমন আছো?');
});

// ---------- স্ক্রিন ----------
function T(id, v) { document.getElementById(id).textContent = v; }
function fmt(x, n) { return (x === null || x === undefined || isNaN(x)) ? '-' : Number(x).toFixed(n); }
function hhmm(ep) {
  const d = new Date(ep * 1000);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
const NAMES = { BUY: '📈 উপরে যাওয়ার সংকেত (BUY)', SELL: '📉 নিচে নামার সংকেত (SELL)', WAIT: '⏳ পরিষ্কার সংকেত নেই' };

function render() {
  const left = Math.floor(60 - (nowSec() % 60));
  T('price', fmt(candles.length ? candles[candles.length - 1].c : 0, 5));
  T('status', status);
  const s = document.getElementById('signal');
  const c = document.getElementById('count');
  const a = analyze(candles.slice(-WINDOW));
  const stale = !lastTickLocal || Date.now() - lastTickLocal > 20000;
  if (!a) {
    s.textContent = 'ডেটা জমছে... (' + candles.length + '/40 ক্যান্ডেল)';
    s.className = 'signal';
    c.textContent = '⏳ ক্যান্ডেল শেষ হতে ' + left + ' সেকেন্ড বাকি';
    c.className = 'count';
  } else if (stale) {
    s.textContent = '⚠️ লাইভ দাম আসছে না। মার্কেট বন্ধ বা নেট সমস্যা হতে পারে';
    s.className = 'signal';
    c.textContent = '⏸ সংকেত বন্ধ রাখা হয়েছে';
    c.className = 'count';
  } else {
    const cls = a.code === 'BUY' ? ' buy' : a.code === 'SELL' ? ' sell' : '';
    if (left <= 10) {
      const key = Math.floor(nowSec() / 60);
      if (spokenKey !== key) {
        spokenKey = key;
        if (a.code === 'BUY') speak('এন্ট্রির সময়। উপরে যাওয়ার সংকেত।');
        else if (a.code === 'SELL') speak('এন্ট্রির সময়। নিচে নামার সংকেত।');
        else speak('এন্ট্রির সময়। এখন কোনো স্পষ্ট সংকেত নেই।');
      }
      c.textContent = '⏰ এন্ট্রির সময়! ' + left + ' সেকেন্ড বাকি';
      c.className = 'count go';
      s.textContent = NAMES[a.code];
      s.className = 'signal' + cls;
    } else {
      c.textContent = '⏳ ক্যান্ডেল শেষ হতে ' + left + ' সেকেন্ড বাকি';
      c.className = 'count';
      s.textContent = 'অপেক্ষা করো... (এখনকার হিসাব: ' + NAMES[a.code] + ')';
      s.className = 'signal';
    }
    document.getElementById('bar').style.width = a.confidence + '%';
    T('conf', 'ইন্ডিকেটরের মিল: ' + a.confidence + '% (স্কোর ' + a.score + '/৬) — এটা জেতার সম্ভাবনা নয়');
    const ul = document.getElementById('reasons');
    ul.innerHTML = '';
    a.reasons.forEach(function (r) { const li = document.createElement('li'); li.textContent = r; ul.appendChild(li); });
    T('i_rsi', fmt(a.ind.rsi, 1));
    T('i_stoch', fmt(a.ind.stoch, 0));
    T('i_ef', fmt(a.ind.ema_fast, 5));
    T('i_es', fmt(a.ind.ema_slow, 5));
    T('i_macd', fmt(a.ind.macd_hist, 6));
    T('i_atr', fmt(a.ind.atr, 5));
  }
  if (backtest) {
    const b = backtest;
    if (b.total === 0) T('bt', 'যথেষ্ট ডেটা নেই');
    else T('bt', b.candles + ' টা ক্যান্ডেলে ' + b.total + ' টা সংকেত: ' + b.wins + ' জেতা, ' + b.losses +
      ' হারা → জেতার হার ' + b.rate + '%. BUY ' + b.buy_rate + '% (' + b.buy_n + ' টা), SELL ' +
      b.sell_rate + '% (' + b.sell_n + ' টা). ওই সময়ে দাম উপরে গিয়েছিল ' + b.base_up + '% বার।');
    T('be', 'পেআউট ' + PAYOUT + ' ধরলে ব্রেক-ইভেন জেতার হার প্রায় ' + (Math.round(100 / (1 + PAYOUT) * 10) / 10) +
      '%। এর নিচে থাকলে দীর্ঘমেয়াদে লোকসান।');
  }
  const L = liveStats();
  if (L.wins + L.losses + L.draws > 0)
    T('live', 'জিতেছে ' + L.wins + ', হেরেছে ' + L.losses + ', সমান ' + L.draws + ' → জেতার হার ' + L.rate + '%');
  const h = document.getElementById('hist');
  h.innerHTML = '';
  symResults().slice(-10).reverse().forEach(function (r) {
    const li = document.createElement('li');
    const cls = r.result === 'WIN' ? 'win' : r.result === 'LOSS' ? 'loss' : 'draw';
    const txt = r.result === 'WIN' ? 'জিত ✅' : r.result === 'LOSS' ? 'হার ❌' : 'সমান ➖';
    const row = document.createElement('div');
    row.className = 'row';
    const left = document.createElement('span');
    left.textContent = hhmm(r.time) + ' ' + r.signal;
    const right = document.createElement('span');
    right.className = cls;
    right.textContent = txt;
    row.appendChild(left);
    row.appendChild(right);
    li.appendChild(row);
    h.appendChild(li);
  });
}
