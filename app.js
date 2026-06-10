/* ============================================================
   TradeFG — Trading Journal App Logic
   ============================================================ */

// ─── STATE ───────────────────────────────────────────────────
let state = {
  trades: [],
  journals: [],
  settings: { startingCapital: 10000, maxRisk: 2, dailyLoss: 500, rrTarget: 2 },
  currentView: 'dashboard',
  sortKey: 'date',
  sortDir: 'desc',
  currentPage: 1,
  pageSize: 15,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  charts: {},
  equityFilter: 'all',
};

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  if (state.trades.length === 0) loadSampleData();
  setDefaultDate();
  initCharts();
  updateDashboard();
  renderCalendar();
  renderJournalList();
});

// ─── ROUTING ─────────────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (page === 'landing') {
    document.getElementById('landing-page').classList.add('active');
  } else {
    document.getElementById('app-page').classList.add('active');
    updateDashboard();
    renderTradesTable();
    renderAnalytics();
    renderCalendar();
    renderJournalList();
    updateCharts();
  }
}

function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  state.currentView = view;

  const titles = {
    dashboard: ['Dashboard', 'Welcome back, Rohan 👋'],
    trades:    ['Trade Log', 'Manage and review all your trades'],
    analytics: ['Analytics', 'Deep dive into your performance'],
    journal:   ['Trading Journal', 'Reflect and improve'],
    calendar:  ['Calendar', 'Daily performance overview'],
    settings:  ['Settings', 'Configure your account'],
  };
  document.getElementById('page-title').textContent = titles[view][0];
  document.getElementById('page-subtitle').textContent = titles[view][1];

  if (view === 'trades')    renderTradesTable();
  if (view === 'analytics') { renderAnalytics(); setTimeout(updateAnalyticsCharts, 50); }
  if (view === 'calendar')  renderCalendar();
}

// ─── LOCAL STORAGE ────────────────────────────────────────────
function saveToStorage() {
  localStorage.setItem('tradefg_trades', JSON.stringify(state.trades));
  localStorage.setItem('tradefg_journals', JSON.stringify(state.journals));
  localStorage.setItem('tradefg_settings', JSON.stringify(state.settings));
}

function loadFromStorage() {
  const t = localStorage.getItem('tradefg_trades');
  const j = localStorage.getItem('tradefg_journals');
  const s = localStorage.getItem('tradefg_settings');
  if (t) state.trades   = JSON.parse(t);
  if (j) state.journals = JSON.parse(j);
  if (s) state.settings = { ...state.settings, ...JSON.parse(s) };
}

// ─── SAMPLE DATA ──────────────────────────────────────────────
function loadSampleData() {
  const symbols = ['AAPL', 'TSLA', 'SPY', 'QQQ', 'NVDA', 'AMD', 'META', 'MSFT', 'BTC/USD', 'ETH/USD'];
  const setups  = ['Breakout', 'Pullback', 'Reversal', 'VWAP', 'Support/Resistance', 'Gap Fill'];
  const emotions = ['😊 Confident', '😎 Calm', '😤 Frustrated', '🤔 Uncertain', '😃 Excited'];
  const now = new Date();
  state.trades = [];

  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const tradesPerDay = Math.floor(Math.random() * 3) + 1;
    for (let t = 0; t < tradesPerDay; t++) {
      const dir = Math.random() > 0.45 ? 'long' : 'short';
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const basePrice = sym === 'BTC/USD' ? 45000 : sym === 'ETH/USD' ? 2800 : 100 + Math.random() * 400;
      const entry = parseFloat((basePrice + (Math.random() - 0.5) * 10).toFixed(2));
      const win = Math.random() > 0.38;
      const move = (0.005 + Math.random() * 0.03) * (win ? 1 : -1) * (dir === 'long' ? 1 : -1);
      const exit = parseFloat((entry * (1 + move)).toFixed(2));
      const size = Math.floor(10 + Math.random() * 90);
      const commission = parseFloat((size * 0.005 + Math.random() * 2).toFixed(2));
      const rawPnl = dir === 'long' ? (exit - entry) * size : (entry - exit) * size;
      const pnl = parseFloat((rawPnl - commission).toFixed(2));
      const sl = dir === 'long' ? parseFloat((entry * 0.98).toFixed(2)) : parseFloat((entry * 1.02).toFixed(2));
      const risk = Math.abs((entry - sl) * size);
      const rr = risk > 0 ? parseFloat((Math.abs(pnl) / risk).toFixed(2)) : 0;

      state.trades.push({
        id: Date.now() + Math.random(),
        date: d.toISOString().split('T')[0],
        symbol: sym,
        direction: dir,
        entry, exit, size, sl,
        tp: dir === 'long' ? parseFloat((entry * 1.04).toFixed(2)) : parseFloat((entry * 0.96).toFixed(2)),
        commission,
        pnl,
        rr,
        setup: setups[Math.floor(Math.random() * setups.length)],
        timeframe: ['5m','15m','1h','4h'][Math.floor(Math.random() * 4)],
        emotion: emotions[Math.floor(Math.random() * emotions.length)],
        notes: '',
        result: pnl > 0 ? 'win' : pnl < -5 ? 'loss' : 'breakeven',
      });
    }
  }

  state.journals = [
    {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      title: 'Morning Breakout Session',
      mood: '🎯 Focused',
      plan: 'Looking for breakout plays on AAPL and NVDA. Key resistance at $185 for AAPL. Watch for volume confirmation on any move above.',
      notes: 'Caught the AAPL breakout perfectly. Missed NVDA entry due to hesitation. Need to be faster on confirmed setups.',
      lessons: 'Trust your analysis. When you see confirmation, act immediately. Hesitation costs money.',
    },
    {
      id: 2,
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      title: 'Choppy Market Day',
      mood: '😤 Frustrated',
      plan: 'Light trading day. Will focus on 1-2 high quality setups only. No chasing.',
      notes: 'Got chopped up in the morning session. Broke my rule of max 3 trades. Ended up red.',
      lessons: 'On choppy days, sit on hands. Not every day needs to be an active trading day.',
    },
  ];

  saveToStorage();
  updateDashboard();
  renderTradesTable();
  renderCalendar();
  renderJournalList();
  updateCharts();
  showToast('Sample data loaded!', 'info');
}

// ─── METRICS ─────────────────────────────────────────────────
function getMetrics(trades) {
  if (!trades.length) return { pnl: 0, winRate: 0, wins: 0, losses: 0, total: 0, rr: 0, drawdown: 0, pf: 0, bestTrade: 0, worstTrade: 0, avgWin: 0, avgLoss: 0, winStreak: 0, lossStreak: 0, totalComm: 0 };

  const closed = trades.filter(t => t.exit);
  const wins   = closed.filter(t => t.result === 'win');
  const losses = closed.filter(t => t.result === 'loss');
  const totalPnl = closed.reduce((s, t) => s + t.pnl, 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  // Drawdown
  let peak = 0, dd = 0, running = 0;
  closed.sort((a,b) => a.date.localeCompare(b.date)).forEach(t => {
    running += t.pnl;
    if (running > peak) peak = running;
    const cur = peak > 0 ? ((peak - running) / peak) * 100 : 0;
    if (cur > dd) dd = cur;
  });

  // Streaks
  let wStreak = 0, lStreak = 0, curW = 0, curL = 0;
  closed.forEach(t => {
    if (t.result === 'win')  { curW++; curL = 0; if (curW > wStreak) wStreak = curW; }
    else                     { curL++; curW = 0; if (curL > lStreak) lStreak = curL; }
  });

  const avgRR = closed.length ? closed.reduce((s,t) => s + (t.rr || 0), 0) / closed.length : 0;

  return {
    pnl: totalPnl,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    wins: wins.length, losses: losses.length,
    total: trades.length,
    open: trades.filter(t => !t.exit).length,
    rr: avgRR,
    drawdown: dd,
    pf: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    bestTrade:  closed.length ? Math.max(...closed.map(t => t.pnl)) : 0,
    worstTrade: closed.length ? Math.min(...closed.map(t => t.pnl)) : 0,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    winStreak: wStreak,
    lossStreak: lStreak,
    totalComm: trades.reduce((s, t) => s + (t.commission || 0), 0),
  };
}

// ─── DASHBOARD ────────────────────────────────────────────────
function updateDashboard() {
  const m = getMetrics(state.trades);
  const fmt = (n) => (n >= 0 ? '+' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtD = (n) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  set('kpi-pnl',    fmt(m.pnl));
  set('kpi-pnl-change', m.pnl >= 0 ? '+' + ((m.pnl / state.settings.startingCapital) * 100).toFixed(1) + '% ROI' : ((m.pnl / state.settings.startingCapital) * 100).toFixed(1) + '% ROI', m.pnl >= 0 ? 'positive' : 'negative');
  set('kpi-winrate', m.winRate.toFixed(1) + '%');
  set('kpi-winrate-change', `${m.wins} wins / ${m.losses} losses`);
  set('kpi-rr', '1:' + m.rr.toFixed(1));
  set('kpi-rr-change', 'Based on ' + (m.wins + m.losses) + ' closed trades');
  set('kpi-total', m.total);
  set('kpi-total-change', m.open + ' open positions');
  set('kpi-drawdown', m.drawdown.toFixed(1) + '%', m.drawdown > 0 ? 'negative' : '');
  set('kpi-drawdown-change', 'Max peak to trough');
  set('kpi-pf', isFinite(m.pf) ? m.pf.toFixed(2) : '∞');
  set('kpi-pf-change', 'Gross profit / gross loss');

  renderRecentTrades();
  updateCharts();
}

function set(id, val, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  if (cls !== undefined) {
    el.className = el.className.replace(/positive|negative/, '') + ' ' + cls;
  }
}

function renderRecentTrades() {
  const el = document.getElementById('recent-trades-list');
  if (!el) return;
  const recent = [...state.trades].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8);
  if (!recent.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No trades yet.</p>'; return; }
  el.innerHTML = recent.map(t => `
    <div class="recent-trade-item">
      <span class="rt-symbol">${t.symbol}</span>
      <span class="rt-dir ${t.direction}">${t.direction.toUpperCase()}</span>
      <span class="rt-meta">${t.date} · ${t.setup || '—'}</span>
      <span class="rt-pnl ${t.pnl >= 0 ? 'pos' : 'neg'}">${t.pnl >= 0 ? '+' : ''}$${Math.abs(t.pnl).toFixed(2)}</span>
    </div>`).join('');
}

// ─── CHARTS ──────────────────────────────────────────────────
function initCharts() {
  Chart.defaults.color = '#9999bb';
  Chart.defaults.borderColor = '#2a2a38';
  Chart.defaults.font.family = 'Inter';

  createEquityChart();
  createWinLossChart();
  createSymbolChart();
}

function createEquityChart() {
  const ctx = document.getElementById('equityChart');
  if (!ctx) return;
  const data = getEquityData();
  if (state.charts.equity) state.charts.equity.destroy();
  state.charts.equity = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Account Value',
        data: data.values,
        borderColor: '#ff6b00',
        backgroundColor: 'rgba(255,107,0,0.08)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: data.values.length > 30 ? 0 : 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#ff6b00',
      }],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#16161f', borderColor: '#333344', borderWidth: 1, padding: 10 } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxTicksLimit: 10 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => '$' + v.toLocaleString() } },
      },
    },
  });
}

function getEquityData() {
  const sorted = [...state.trades].filter(t => t.exit).sort((a,b) => a.date.localeCompare(b.date));
  const filter = state.equityFilter;
  const now = new Date();
  const filtered = sorted.filter(t => {
    const d = new Date(t.date);
    if (filter === '1m')  return d >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (filter === '3m')  return d >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    if (filter === 'ytd') return d.getFullYear() === now.getFullYear();
    return true;
  });

  let running = state.settings.startingCapital;
  const labels = [], values = [];
  labels.push('Start'); values.push(running);
  filtered.forEach(t => {
    running += t.pnl;
    labels.push(t.date);
    values.push(parseFloat(running.toFixed(2)));
  });
  return { labels, values };
}

function setEquityFilter(f, btn) {
  state.equityFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  createEquityChart();
}

function createWinLossChart() {
  const ctx = document.getElementById('winLossChart');
  if (!ctx) return;
  const m = getMetrics(state.trades);
  if (state.charts.winLoss) state.charts.winLoss.destroy();
  state.charts.winLoss = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Wins', 'Losses', 'Breakeven'],
      datasets: [{
        data: [m.wins, m.losses, state.trades.filter(t => t.result === 'breakeven').length],
        backgroundColor: ['rgba(0,230,118,0.8)', 'rgba(255,68,68,0.8)', 'rgba(255,215,0,0.8)'],
        borderColor: ['#00e676', '#ff4444', '#ffd700'],
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 12, boxWidth: 12 } },
        tooltip: { backgroundColor: '#16161f', borderColor: '#333344', borderWidth: 1 },
      },
    },
  });
}

function createSymbolChart() {
  const ctx = document.getElementById('symbolChart');
  if (!ctx) return;
  const symbolData = getSymbolPerformance();
  if (state.charts.symbol) state.charts.symbol.destroy();
  state.charts.symbol = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: symbolData.labels,
      datasets: [{
        data: symbolData.values,
        backgroundColor: symbolData.values.map(v => v >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,68,68,0.7)'),
        borderColor:     symbolData.values.map(v => v >= 0 ? '#00e676' : '#ff4444'),
        borderWidth: 1, borderRadius: 4,
      }],
    },
    options: {
      responsive: true, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#16161f', borderColor: '#333344', borderWidth: 1, callbacks: { label: ctx => ' $' + ctx.raw.toFixed(2) } } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => '$' + v } },
        y: { grid: { display: false } },
      },
    },
  });
}

function getSymbolPerformance() {
  const map = {};
  state.trades.forEach(t => {
    if (!map[t.symbol]) map[t.symbol] = 0;
    map[t.symbol] += t.pnl;
  });
  const sorted = Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 8);
  return { labels: sorted.map(s => s[0]), values: sorted.map(s => parseFloat(s[1].toFixed(2))) };
}

function updateCharts() {
  createEquityChart();
  createWinLossChart();
  createSymbolChart();
}

// ─── ANALYTICS CHARTS ────────────────────────────────────────
function renderAnalytics() {
  const m = getMetrics(state.trades);
  document.getElementById('best-trade').textContent  = '+$' + m.bestTrade.toFixed(2);
  document.getElementById('worst-trade').textContent = '-$' + Math.abs(m.worstTrade).toFixed(2);
  document.getElementById('avg-win').textContent     = '+$' + m.avgWin.toFixed(2);
  document.getElementById('avg-loss').textContent    = '-$' + m.avgLoss.toFixed(2);
  document.getElementById('win-streak').textContent  = m.winStreak;
  document.getElementById('loss-streak').textContent = m.lossStreak;
  document.getElementById('avg-hold').textContent    = '—';
  document.getElementById('total-comm').textContent  = '-$' + m.totalComm.toFixed(2);
}

function updateAnalyticsCharts() {
  createMonthlyPnlChart();
  createSetupChart();
  createDowChart();
  createDistributionChart();
}

function createMonthlyPnlChart() {
  const ctx = document.getElementById('monthlyPnlChart');
  if (!ctx) return;
  const months = {};
  state.trades.forEach(t => {
    const key = t.date.slice(0, 7);
    if (!months[key]) months[key] = 0;
    months[key] += t.pnl;
  });
  const sorted = Object.entries(months).sort((a,b) => a[0].localeCompare(b[0]));
  if (state.charts.monthly) state.charts.monthly.destroy();
  state.charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(e => e[0]),
      datasets: [{
        label: 'P&L',
        data: sorted.map(e => parseFloat(e[1].toFixed(2))),
        backgroundColor: sorted.map(e => e[1] >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,68,68,0.7)'),
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#16161f', borderColor: '#333344', borderWidth: 1 } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => '$' + v } },
      },
    },
  });
}

function createSetupChart() {
  const ctx = document.getElementById('setupChart');
  if (!ctx) return;
  const setups = {};
  state.trades.forEach(t => {
    if (!t.setup) return;
    if (!setups[t.setup]) setups[t.setup] = 0;
    setups[t.setup] += t.pnl;
  });
  const sorted = Object.entries(setups).sort((a,b) => b[1] - a[1]);
  if (state.charts.setup) state.charts.setup.destroy();
  state.charts.setup = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(e => e[0]),
      datasets: [{
        data: sorted.map(e => parseFloat(e[1].toFixed(2))),
        backgroundColor: sorted.map(e => e[1] >= 0 ? 'rgba(255,107,0,0.7)' : 'rgba(255,68,68,0.7)'),
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#16161f', borderColor: '#333344', borderWidth: 1 } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => '$' + v } },
        y: { grid: { display: false } },
      },
    },
  });
}

function createDowChart() {
  const ctx = document.getElementById('dowChart');
  if (!ctx) return;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dow = [0,0,0,0,0,0,0];
  state.trades.forEach(t => {
    const d = new Date(t.date + 'T12:00:00');
    dow[d.getDay()] += t.pnl;
  });
  if (state.charts.dow) state.charts.dow.destroy();
  state.charts.dow = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        data: dow.map(v => parseFloat(v.toFixed(2))),
        backgroundColor: dow.map(v => v >= 0 ? 'rgba(255,107,0,0.7)' : 'rgba(255,68,68,0.7)'),
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => '$' + v } },
      },
    },
  });
}

function createDistributionChart() {
  const ctx = document.getElementById('distributionChart');
  if (!ctx) return;
  const pnls = state.trades.map(t => t.pnl);
  if (!pnls.length) return;
  const min = Math.min(...pnls), max = Math.max(...pnls);
  const bins = 20;
  const binSize = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  const binLabels = [];
  for (let i = 0; i < bins; i++) binLabels.push('$' + (min + i * binSize).toFixed(0));
  pnls.forEach(p => {
    const idx = Math.min(Math.floor((p - min) / binSize), bins - 1);
    counts[idx]++;
  });
  const binColors = binLabels.map(l => parseFloat(l.replace('$', '')) >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,68,68,0.7)');
  if (state.charts.dist) state.charts.dist.destroy();
  state.charts.dist = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: binLabels,
      datasets: [{ label: 'Frequency', data: counts, backgroundColor: binColors, borderRadius: 3 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' } },
      },
    },
  });
}

// ─── TRADES TABLE ─────────────────────────────────────────────
function renderTradesTable() {
  const sym = document.getElementById('filter-symbol');
  const allSymbols = [...new Set(state.trades.map(t => t.symbol))].sort();
  const curSym = sym.value;
  sym.innerHTML = '<option value="all">All Symbols</option>' + allSymbols.map(s => `<option value="${s}" ${s === curSym ? 'selected' : ''}>${s}</option>`).join('');

  let trades = filterTrades();
  trades = sortTrades(trades);

  const total = trades.length;
  const pages = Math.ceil(total / state.pageSize);
  const start = (state.currentPage - 1) * state.pageSize;
  const pageTrades = trades.slice(start, start + state.pageSize);

  const tbody = document.getElementById('trades-tbody');
  const empty = document.getElementById('trades-empty');

  if (!total) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    document.getElementById('trades-count').textContent = '0 trades';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  document.getElementById('trades-count').textContent = `${total} trade${total !== 1 ? 's' : ''}`;

  tbody.innerHTML = pageTrades.map(t => `
    <tr>
      <td>${t.date}</td>
      <td><strong>${t.symbol}</strong></td>
      <td><span class="badge badge-${t.direction}">${t.direction.toUpperCase()}</span></td>
      <td>$${t.entry.toFixed(2)}</td>
      <td>${t.exit ? '$' + t.exit.toFixed(2) : '<span style="color:var(--text-muted)">Open</span>'}</td>
      <td>${t.size}</td>
      <td class="${t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</td>
      <td>${t.rr ? '1:' + t.rr.toFixed(1) : '—'}</td>
      <td><span style="color:var(--text-muted);font-size:12px">${t.setup || '—'}</span></td>
      <td><span class="badge badge-${t.result}">${t.result.toUpperCase()}</span></td>
      <td>
        <button class="action-btn" onclick="editTrade('${t.id}')" title="Edit">✏️</button>
        <button class="action-btn" onclick="deleteTrade('${t.id}')" title="Delete">🗑️</button>
      </td>
    </tr>`).join('');

  renderPagination(pages);
}

function filterTrades() {
  const dir  = document.getElementById('filter-direction').value;
  const res  = document.getElementById('filter-result').value;
  const sym  = document.getElementById('filter-symbol').value;
  const from = document.getElementById('filter-date-from').value;
  const to   = document.getElementById('filter-date-to').value;
  const q    = document.getElementById('global-search').value.toLowerCase();

  return state.trades.filter(t =>
    (dir === 'all' || t.direction === dir) &&
    (res === 'all' || t.result === res) &&
    (sym === 'all' || t.symbol === sym) &&
    (!from || t.date >= from) &&
    (!to   || t.date <= to) &&
    (!q    || t.symbol.toLowerCase().includes(q) || (t.setup || '').toLowerCase().includes(q))
  );
}

function sortTrades(trades) {
  return trades.sort((a, b) => {
    let va = a[state.sortKey], vb = b[state.sortKey];
    if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase();
    if (va < vb) return state.sortDir === 'asc' ? -1 : 1;
    if (va > vb) return state.sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

function sortTable(key) {
  if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  else { state.sortKey = key; state.sortDir = 'desc'; }
  state.currentPage = 1;
  renderTradesTable();
}

function renderPagination(pages) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  const btns = [];
  for (let i = 1; i <= pages; i++) {
    btns.push(`<button class="page-btn ${i === state.currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`);
  }
  el.innerHTML = btns.join('');
}

function goPage(n) { state.currentPage = n; renderTradesTable(); }

document.getElementById('global-search').addEventListener('input', () => { state.currentPage = 1; if (state.currentView === 'trades') renderTradesTable(); });

// ─── TRADE CRUD ───────────────────────────────────────────────
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('trade-date').value = today;
  document.getElementById('journal-date').value = today;
}

function openAddTrade() {
  document.getElementById('modal-title').textContent = 'Add Trade';
  document.getElementById('trade-id').value = '';
  ['trade-symbol','trade-entry','trade-exit','trade-size','trade-sl','trade-tp','trade-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('trade-commission').value = '0';
  document.getElementById('trade-direction').value = 'long';
  document.getElementById('trade-setup').value = '';
  document.getElementById('trade-timeframe').value = '1h';
  document.getElementById('trade-emotion').value = '';
  setDefaultDate();
  calcPnL();
  document.getElementById('trade-modal').classList.add('active');
}

function editTrade(id) {
  const t = state.trades.find(tr => tr.id == id);
  if (!t) return;
  document.getElementById('modal-title').textContent = 'Edit Trade';
  document.getElementById('trade-id').value = t.id;
  document.getElementById('trade-symbol').value = t.symbol;
  document.getElementById('trade-date').value = t.date;
  document.getElementById('trade-direction').value = t.direction;
  document.getElementById('trade-entry').value = t.entry;
  document.getElementById('trade-exit').value = t.exit || '';
  document.getElementById('trade-size').value = t.size;
  document.getElementById('trade-sl').value = t.sl || '';
  document.getElementById('trade-tp').value = t.tp || '';
  document.getElementById('trade-commission').value = t.commission || 0;
  document.getElementById('trade-setup').value = t.setup || '';
  document.getElementById('trade-timeframe').value = t.timeframe || '1h';
  document.getElementById('trade-emotion').value = t.emotion || '';
  document.getElementById('trade-notes').value = t.notes || '';
  calcPnL();
  document.getElementById('trade-modal').classList.add('active');
}

function saveTrade() {
  const symbol = document.getElementById('trade-symbol').value.trim().toUpperCase();
  const date   = document.getElementById('trade-date').value;
  const entry  = parseFloat(document.getElementById('trade-entry').value);
  const size   = parseFloat(document.getElementById('trade-size').value);

  if (!symbol || !date || !entry || !size) { showToast('Please fill in required fields (Symbol, Date, Entry, Size)', 'error'); return; }

  const exit  = parseFloat(document.getElementById('trade-exit').value) || null;
  const dir   = document.getElementById('trade-direction').value;
  const sl    = parseFloat(document.getElementById('trade-sl').value) || null;
  const tp    = parseFloat(document.getElementById('trade-tp').value) || null;
  const comm  = parseFloat(document.getElementById('trade-commission').value) || 0;
  const setup = document.getElementById('trade-setup').value;
  const tf    = document.getElementById('trade-timeframe').value;
  const emo   = document.getElementById('trade-emotion').value;
  const notes = document.getElementById('trade-notes').value;

  let pnl = 0, rr = 0, result = 'open';
  if (exit) {
    const raw = dir === 'long' ? (exit - entry) * size : (entry - exit) * size;
    pnl = parseFloat((raw - comm).toFixed(2));
    result = pnl > 5 ? 'win' : pnl < -5 ? 'loss' : 'breakeven';
    if (sl) {
      const risk = Math.abs(entry - sl) * size;
      rr = risk > 0 ? parseFloat((Math.abs(pnl) / risk).toFixed(2)) : 0;
    }
  }

  const id = document.getElementById('trade-id').value;
  const trade = { id: id || (Date.now() + Math.random()), date, symbol, direction: dir, entry, exit, size, sl, tp, commission: comm, pnl, rr, setup, timeframe: tf, emotion: emo, notes, result };

  if (id) {
    const idx = state.trades.findIndex(t => t.id == id);
    if (idx !== -1) state.trades[idx] = trade;
  } else {
    state.trades.push(trade);
  }

  saveToStorage();
  closeModal();
  updateDashboard();
  renderTradesTable();
  renderCalendar();
  showToast(id ? 'Trade updated!' : 'Trade added!', 'success');
}

function deleteTrade(id) {
  if (!confirm('Delete this trade?')) return;
  state.trades = state.trades.filter(t => t.id != id);
  saveToStorage();
  updateDashboard();
  renderTradesTable();
  renderCalendar();
  showToast('Trade deleted.', 'info');
}

function calcPnL() {
  const entry = parseFloat(document.getElementById('trade-entry').value);
  const exit  = parseFloat(document.getElementById('trade-exit').value);
  const size  = parseFloat(document.getElementById('trade-size').value);
  const sl    = parseFloat(document.getElementById('trade-sl').value);
  const comm  = parseFloat(document.getElementById('trade-commission').value) || 0;
  const dir   = document.getElementById('trade-direction').value;

  if (!entry || !size) {
    document.getElementById('preview-pnl').textContent = '$0.00';
    document.getElementById('preview-risk').textContent = '$0.00';
    document.getElementById('preview-rr').textContent = '—';
    return;
  }

  const pnlEl = document.getElementById('preview-pnl');
  if (exit) {
    const raw = dir === 'long' ? (exit - entry) * size : (entry - exit) * size;
    const pnl = raw - comm;
    pnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
    pnlEl.className = pnl >= 0 ? 'green' : 'red';
  } else {
    pnlEl.textContent = '$0.00';
    pnlEl.className = '';
  }

  if (sl) {
    const risk = Math.abs(entry - sl) * size;
    document.getElementById('preview-risk').textContent = '$' + risk.toFixed(2);
    if (exit) {
      const raw = dir === 'long' ? (exit - entry) * size : (entry - exit) * size;
      const pnl = raw - comm;
      const rr = risk > 0 ? (Math.abs(pnl) / risk).toFixed(2) : '—';
      document.getElementById('preview-rr').textContent = '1:' + rr;
    }
  } else {
    document.getElementById('preview-risk').textContent = '$0.00';
    document.getElementById('preview-rr').textContent = '—';
  }
}

// ─── JOURNAL ─────────────────────────────────────────────────
function renderJournalList() {
  const el = document.getElementById('journal-list');
  if (!el) return;
  const sorted = [...state.journals].sort((a,b) => b.date.localeCompare(a.date));
  if (!sorted.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:12px;">No journal entries yet.</p>';
    return;
  }
  el.innerHTML = sorted.map(j => `
    <div class="journal-entry-item" onclick="viewJournalEntry('${j.id}')">
      <div class="je-date">${j.date}</div>
      <div class="je-title">${j.title || 'Untitled Entry'}</div>
      <div class="je-mood">${j.mood || ''}</div>
    </div>`).join('');
}

function viewJournalEntry(id) {
  const j = state.journals.find(e => e.id == id);
  if (!j) return;
  document.querySelectorAll('.journal-entry-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.journal-entry-item[onclick*="${id}"]`)?.classList.add('active');

  document.getElementById('journal-editor').innerHTML = `
    <div class="journal-entry-view">
      <h2>${j.title || 'Untitled Entry'}</h2>
      <div class="entry-meta">
        <span>📅 ${j.date}</span>
        <span>${j.mood || ''}</span>
      </div>
      ${j.plan ? `<div class="journal-section"><h4>Pre-Market Plan</h4><p>${j.plan}</p></div>` : ''}
      ${j.notes ? `<div class="journal-section"><h4>Notes & Reflections</h4><p>${j.notes}</p></div>` : ''}
      ${j.lessons ? `<div class="journal-section"><h4>Lessons Learned</h4><p>${j.lessons}</p></div>` : ''}
      <div class="journal-view-actions">
        <button class="btn btn-outline btn-sm" onclick="editJournalEntry('${j.id}')">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteJournalEntry('${j.id}')">🗑 Delete</button>
      </div>
    </div>`;
}

function openAddJournal() {
  document.getElementById('journal-modal-title').textContent = 'New Journal Entry';
  document.getElementById('journal-id').value = '';
  document.getElementById('journal-title-input').value = '';
  document.getElementById('journal-plan').value = '';
  document.getElementById('journal-notes').value = '';
  document.getElementById('journal-lessons').value = '';
  document.getElementById('journal-mood').value = '😊 Great';
  setDefaultDate();
  document.getElementById('journal-modal').classList.add('active');
}

function editJournalEntry(id) {
  const j = state.journals.find(e => e.id == id);
  if (!j) return;
  document.getElementById('journal-modal-title').textContent = 'Edit Journal Entry';
  document.getElementById('journal-id').value = j.id;
  document.getElementById('journal-date').value = j.date;
  document.getElementById('journal-title-input').value = j.title || '';
  document.getElementById('journal-mood').value = j.mood || '😊 Great';
  document.getElementById('journal-plan').value = j.plan || '';
  document.getElementById('journal-notes').value = j.notes || '';
  document.getElementById('journal-lessons').value = j.lessons || '';
  document.getElementById('journal-modal').classList.add('active');
}

function saveJournal() {
  const id    = document.getElementById('journal-id').value;
  const date  = document.getElementById('journal-date').value;
  const title = document.getElementById('journal-title-input').value.trim();
  const mood  = document.getElementById('journal-mood').value;
  const plan  = document.getElementById('journal-plan').value.trim();
  const notes = document.getElementById('journal-notes').value.trim();
  const lessons = document.getElementById('journal-lessons').value.trim();

  if (!date) { showToast('Please select a date.', 'error'); return; }

  const entry = { id: id || Date.now(), date, title, mood, plan, notes, lessons };

  if (id) {
    const idx = state.journals.findIndex(j => j.id == id);
    if (idx !== -1) state.journals[idx] = entry;
  } else {
    state.journals.push(entry);
  }

  saveToStorage();
  closeJournalModal();
  renderJournalList();
  viewJournalEntry(entry.id);
  showToast('Journal entry saved!', 'success');
}

function deleteJournalEntry(id) {
  if (!confirm('Delete this journal entry?')) return;
  state.journals = state.journals.filter(j => j.id != id);
  saveToStorage();
  renderJournalList();
  document.getElementById('journal-editor').innerHTML = `<div class="journal-empty"><div class="empty-icon">📝</div><h3>Select or create a journal entry</h3><p>Reflect on your trades, emotions, and lessons learned.</p><button class="btn btn-primary" onclick="openAddJournal()">+ New Entry</button></div>`;
  showToast('Entry deleted.', 'info');
}

// ─── CALENDAR ─────────────────────────────────────────────────
function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const year = state.calendarYear, month = state.calendarMonth;
  const title = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('calendar-title').textContent = title;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const dayPnl = {};
  state.trades.forEach(t => {
    if (t.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)) {
      if (!dayPnl[t.date]) dayPnl[t.date] = 0;
      dayPnl[t.date] += t.pnl;
    }
  });

  const headers = ['<div class="cal-day-header">Sun</div>','<div class="cal-day-header">Mon</div>','<div class="cal-day-header">Tue</div>','<div class="cal-day-header">Wed</div>','<div class="cal-day-header">Thu</div>','<div class="cal-day-header">Fri</div>','<div class="cal-day-header">Sat</div>'];
  let cells = [...headers];

  for (let i = 0; i < firstDay; i++) cells.push('<div class="cal-day empty"></div>');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const pnl = dayPnl[dateStr];
    const cls = dateStr === today ? 'today' : pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : '';
    const pnlLabel = pnl !== undefined ? `<span class="cal-day-pnl">${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(0)}</span>` : '';
    cells.push(`<div class="cal-day ${cls}"><span class="cal-day-num">${d}</span>${pnlLabel}</div>`);
  }

  grid.innerHTML = cells.join('');
}

function changeMonth(delta) {
  state.calendarMonth += delta;
  if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
  if (state.calendarMonth < 0)  { state.calendarMonth = 11; state.calendarYear--; }
  renderCalendar();
}

// ─── SETTINGS ─────────────────────────────────────────────────
function saveSettings() {
  state.settings.startingCapital = parseFloat(document.getElementById('starting-capital').value) || 10000;
  saveToStorage();
  updateDashboard();
  showToast('Settings saved!', 'success');
}

function clearAllData() {
  if (!confirm('This will delete ALL trades and journal entries. Are you sure?')) return;
  state.trades = []; state.journals = [];
  saveToStorage();
  updateDashboard();
  renderTradesTable();
  renderCalendar();
  renderJournalList();
  updateCharts();
  showToast('All data cleared.', 'info');
}

// ─── EXPORT ──────────────────────────────────────────────────
function exportCSV() {
  const headers = ['Date','Symbol','Direction','Entry','Exit','Size','P&L','R:R','Setup','Timeframe','Result','Notes'];
  const rows = state.trades.map(t => [t.date, t.symbol, t.direction, t.entry, t.exit || '', t.size, t.pnl.toFixed(2), t.rr || '', t.setup || '', t.timeframe || '', t.result, (t.notes || '').replace(/,/g,'')]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'tradefg_trades.csv';
  a.click();
  showToast('CSV exported!', 'success');
}

// ─── MODAL HELPERS ────────────────────────────────────────────
function closeModal() { document.getElementById('trade-modal').classList.remove('active'); }
function closeJournalModal() { document.getElementById('journal-modal').classList.remove('active'); }
function closeModalOnBackdrop(e) {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal();
    closeJournalModal();
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeJournalModal(); }
});

// ─── SIDEBAR ──────────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  sb.style.width = sb.style.width === '60px' ? '' : '60px';
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3200);
}
