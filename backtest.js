// ===== Backtest: replay the signal logic on past candles =====
function runBacktest(cs) {
  let wins = 0, losses = 0, draws = 0, bw = 0, bn = 0, sw = 0, sn = 0;
  for (let i = 40; i < cs.length - 1; i++) {
    if (cs[i + 1].t - cs[i].t !== TF) continue;   // skip gaps (e.g. weekends)
    const a = analyze(cs.slice(Math.max(0, i - WINDOW + 1), i + 1));
    if (!a || a.code === 'WAIT') continue;
    const cur = cs[i].c, nxt = cs[i + 1].c;
    if (nxt === cur) { draws++; continue; }
    const up = nxt > cur;
    const win = (a.code === 'BUY' && up) || (a.code === 'SELL' && !up);
    if (a.code === 'BUY') { bn++; if (win) bw++; } else { sn++; if (win) sw++; }
    if (win) wins++; else losses++;
  }
  const total = wins + losses;
  const pct = function (a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; };
  return {
    candles: cs.length, total: total, wins: wins, losses: losses, draws: draws,
    rate: pct(wins, total), buy_rate: pct(bw, bn), buy_n: bn, sell_rate: pct(sw, sn), sell_n: sn
  };
}

// The candle that is still forming is excluded from the backtest.
function refreshBacktest() {
  let closed = candles;
  const cur = Math.floor(nowSec() / TF) * TF;
  if (closed.length && closed[closed.length - 1].t >= cur) closed = closed.slice(0, -1);
  backtest = closed.length > 45 ? runBacktest(closed) : null;
}
