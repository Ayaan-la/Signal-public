// ===== Deriv থেকে লাইভ ডেটা (WebSocket) =====
function setHistory(rows) {
  candles = rows.map(function (c) {
    return { t: +c.epoch, o: +c.open, h: +c.high, l: +c.low, c: +c.close };
  });
  // চলমান (অসম্পূর্ণ) ক্যান্ডেল ব্যাকটেস্টে ধরা হয় না
  let closed = candles;
  const curMinute = Math.floor(nowSec() / 60) * 60;
  if (closed.length && closed[closed.length - 1].t >= curMinute) closed = closed.slice(0, -1);
  if (closed.length > 45) backtest = runBacktest(closed);
}

function onTick(price, epoch) {
  const minute = Math.floor(epoch / 60) * 60;
  const lastC = candles[candles.length - 1];
  if (lastC && lastC.t === minute) {
    lastC.c = price;
    lastC.h = Math.max(lastC.h, price);
    lastC.l = Math.min(lastC.l, price);
  } else if (lastC && minute < lastC.t) {
    // পুরোনো টিক, বাদ
  } else {
    candles.push({ t: minute, o: price, h: price, l: price, c: price });
    if (candles.length > 1500) candles.shift();
  }
  // সময়ের ফারাক: নেটওয়ার্ক দেরির কারণে নমুনা সবসময় একটু কম আসে, তাই সবচেয়ে বড়টা নিই
  offsetSamples.push(epoch - Date.now() / 1000);
  if (offsetSamples.length > 30) offsetSamples.shift();
  clockOffset = Math.max.apply(null, offsetSamples);
  lastTickLocal = Date.now();
  trackerOnTick(price, epoch);
}

function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function requestHistory(count) {
  send({ ticks_history: SYMBOL, count: count, end: 'latest', style: 'candles', granularity: 60 });
}

let histCount = HISTORY_COUNT;
function scheduleReconnect(ms) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(function () { reconnectTimer = null; connect(); }, ms);
}

function connect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} }
  status = 'কানেক্ট হচ্ছে...';
  ws = new WebSocket(WS_URL);
  ws.onopen = function () {
    status = 'কানেক্টেড ✅ ডেটা আনছি...';
    histCount = HISTORY_COUNT;
    requestHistory(histCount);
    send({ ticks: SYMBOL, subscribe: 1 });
    clearInterval(pingTimer);
    pingTimer = setInterval(function () { send({ ping: 1 }); }, 25000);
  };
  ws.onmessage = function (ev) {
    let data;
    try { data = JSON.parse(ev.data); } catch (e) { return; }
    if (data.error) {
      status = 'সার্ভার এরর: ' + (data.error.message || JSON.stringify(data.error));
      if (data.msg_type === 'ticks_history' && histCount > 120) { histCount = 120; requestHistory(histCount); }
      return;
    }
    if (data.candles) { setHistory(data.candles); }
    else if (data.tick) {
      onTick(+data.tick.quote, +data.tick.epoch);
      status = 'কানেক্টেড ✅ লাইভ দাম আসছে';
    }
  };
  ws.onclose = function () {
    status = 'আবার কানেক্ট হচ্ছে...';
    clearInterval(pingTimer);
    scheduleReconnect(3000);
  };
  ws.onerror = function () { try { ws.close(); } catch (e) {} };
}

// ফোন ব্যাকগ্রাউন্ডে গিয়ে ফিরলে বা ডেটা থেমে গেলে আবার কানেক্ট
function ensureConnected() {
  if (ws && ws.readyState === 0) return;           // এখনো কানেক্ট হচ্ছে
  if (!ws || ws.readyState >= 2 || Date.now() - lastTickLocal > 30000) connect();
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) ensureConnected();
});
setInterval(function () {
  if (!document.hidden && lastTickLocal) ensureConnected();
}, 10000);
