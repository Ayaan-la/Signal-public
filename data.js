// ===== Live market data from Deriv (WebSocket) =====
function setHistory(rows) {
  candles = rows.map(function (c) {
    return { t: +c.epoch, o: +c.open, h: +c.high, l: +c.low, c: +c.close };
  });
  refreshBacktest();
}

function onTick(price, epoch) {
  const bucket = Math.floor(epoch / TF) * TF;
  const lastC = candles[candles.length - 1];
  if (lastC && lastC.t === bucket) {
    lastC.c = price;
    lastC.h = Math.max(lastC.h, price);
    lastC.l = Math.min(lastC.l, price);
  } else if (lastC && bucket < lastC.t) {
    // old tick, ignore
  } else {
    candles.push({ t: bucket, o: price, h: price, l: price, c: price });
    if (candles.length > 1500) candles.shift();
  }
  // Network delay makes each sample slightly low, so the largest recent sample is closest to the truth.
  offsetSamples.push(epoch - Date.now() / 1000);
  if (offsetSamples.length > 30) offsetSamples.shift();
  clockOffset = Math.max.apply(null, offsetSamples);
  lastTickLocal = Date.now();
  trackerOnTick(price, epoch);
}

function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

function requestHistory(count) {
  send({ ticks_history: SYMBOL, count: count, end: 'latest', style: 'candles', granularity: TF });
}

let histCount = HISTORY_COUNT;

function scheduleReconnect(ms) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(function () { reconnectTimer = null; connect(); }, ms);
}

function connect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} }
  status = 'Connecting...';
  ws = new WebSocket(WS_URL);
  ws.onopen = function () {
    status = 'Connected, loading history...';
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
      status = 'Server error: ' + (data.error.message || JSON.stringify(data.error));
      if (data.msg_type === 'ticks_history' && histCount > 120) { histCount = 120; requestHistory(histCount); }
      return;
    }
    if (data.candles) {
      setHistory(data.candles);
    } else if (data.tick) {
      onTick(+data.tick.quote, +data.tick.epoch);
      status = 'Streaming live prices';
    }
  };
  ws.onclose = function () {
    status = 'Reconnecting...';
    clearInterval(pingTimer);
    scheduleReconnect(3000);
  };
  ws.onerror = function () { try { ws.close(); } catch (e) {} };
}

// Reconnect when the phone wakes up or the feed goes quiet.
function ensureConnected() {
  if (ws && ws.readyState === 0) return;
  if (!ws || ws.readyState >= 2 || Date.now() - lastTickLocal > 30000) connect();
}
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) ensureConnected();
});
setInterval(function () {
  if (!document.hidden && lastTickLocal) ensureConnected();
}, 10000);
