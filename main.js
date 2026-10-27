// ===== অ্যাপ চালু করা =====
const sel = document.getElementById('symSel');
SYMBOLS.forEach(function (s) {
  const o = document.createElement('option');
  o.value = s[0]; o.textContent = s[1];
  if (s[0] === SYMBOL) o.selected = true;
  sel.appendChild(o);
});
sel.addEventListener('change', function () {
  lsSet('sb_symbol', sel.value);
  location.reload();
});

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () {}); }
connect();
render();
setInterval(render, 1000);
