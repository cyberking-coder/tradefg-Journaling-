/* =================================================================
   TradeFG — App Logic
================================================================= */

// ── STATE ─────────────────────────────────────────────────────
const S = {
  trades: [], journals: [],
  settings: { startingCapital: 10000 },
  sort: { key: 'date', dir: 'desc' },
  page: 1, pageSize: 15,
  calYear: new Date().getFullYear(), calMonth: new Date().getMonth(),
  equityFilter: '1w', anFilter: 'all',
  charts: {}, sidebarCollapsed: false,
};

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  load();
  if (!S.trades.length) loadSampleData();
  setToday();
  startClock();
  initMockChart();
  initApChart();
  renderDashboard();
  renderMiniCal();
  renderJournalPanel();
  renderLeaderboard();
  document.getElementById('global-search').addEventListener('input', () => { if (document.getElementById('view-trades').classList.contains('active')) renderTrades(); });
});

// ── THEME ─────────────────────────────────────────────────────
function toggleTheme() { document.body.classList.toggle('light'); }

// ── PAGES ─────────────────────────────────────────────────────
function showPage(p) {
  document.querySelectorAll('.page').forEach(e => e.classList.remove('active'));
  document.getElementById(p + '-page').classList.add('active');
  if (p === 'app') {
    renderDashboard();
    renderTrades();
    renderMiniCal();
    updateAnalytics();
  }
}

// ── VIEW ROUTING ──────────────────────────────────────────────
function showView(v) {
  document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.sb-item, .sb-sub').forEach(e => e.classList.remove('active'));

  const el = document.getElementById('view-' + v);
  if (el) el.classList.add('active');

  const navEl = document.querySelector(`[data-view="${v}"]`);
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard:     ['Dashboard',         new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})],
    trades:        ['Trades',            'Manage and review all your trades'],
    journal:       ['Journal',           'Rich trade journaling'],
    performance:   ['Performance Analytics', 'Analyze your trading patterns'],
    'trade-analysis': ['Trade Analysis', 'Deep dive into individual trades'],
    market:        ['Market',            'Live market overview'],
    lounge:        ['Traders Lounge',    'Community discussion'],
    rooms:         ['Trade Rooms',       'Coming soon'],
    friends:       ['Friends',           'Your trading network'],
    leaderboard:   ['Leaderboard',       'Top traders this month'],
    'coming-soon': ['Coming Soon',       'New features on the way'],
    settings:      ['Settings',          'Account & preferences'],
  };
  const t = titles[v] || [v, ''];
  document.getElementById('page-title').textContent = t[0];
  document.getElementById('page-date').textContent = t[1];

  if (v === 'trades') renderTrades();
  if (v === 'journal') renderJournalPanel();
  if (v === 'performance') { updateAnalytics(); setTimeout(drawAnalyticsCharts, 80); }
  if (v === 'trade-analysis') setTimeout(drawTradeAnalysisCharts, 80);
  if (v === 'leaderboard') renderLeaderboard();
}

function toggleGroup(name) {
  const el = document.getElementById('group-' + name);
  const arrow = document.getElementById('arrow-' + name);
  const open = el.style.display !== 'none' && el.style.display !== '';
  el.style.display = open ? 'none' : 'block';
  arrow.textContent = open ? '▼' : '▲';
}

// ── SIDEBAR ───────────────────────────────────────────────────
function toggleSidebar() {
  S.sidebarCollapsed = !S.sidebarCollapsed;
  const sb = document.getElementById('sidebar');
  const main = document.getElementById('app-main');
  if (S.sidebarCollapsed) {
    sb.style.width = '0';
    sb.style.overflow = 'hidden';
    document.querySelector('.app-layout').style.gridTemplateColumns = '0 1fr';
  } else {
    sb.style.width = '';
    sb.style.overflow = '';
    document.querySelector('.app-layout').style.gridTemplateColumns = '';
  }
}

// ── CLOCK ─────────────────────────────────────────────────────
function startClock() {
  const tick = () => {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent = '🕐 ' + now.toLocaleTimeString('en-US', { hour12: true });
    const dateEl = document.getElementById('page-date');
    if (dateEl && document.getElementById('view-dashboard').classList.contains('active')) {
      dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
  };
  tick();
  setInterval(tick, 1000);
}

function setToday() {
  const t = new Date().toISOString().split('T')[0];
  const el = document.getElementById('t-date');
  if (el) el.value = t;
}

// ── STORAGE ───────────────────────────────────────────────────
function save() {
  localStorage.setItem('tfg_trades', JSON.stringify(S.trades));
  localStorage.setItem('tfg_journals', JSON.stringify(S.journals));
  localStorage.setItem('tfg_settings', JSON.stringify(S.settings));
}
function load() {
  const t = localStorage.getItem('tfg_trades');
  const j = localStorage.getItem('tfg_journals');
  const s = localStorage.getItem('tfg_settings');
  if (t) S.trades = JSON.parse(t);
  if (j) S.journals = JSON.parse(j);
  if (s) S.settings = { ...S.settings, ...JSON.parse(s) };
}

// ── SAMPLE DATA ───────────────────────────────────────────────
function loadSampleData() {
  const symbols = ['XAUUSD','BTCUSD','EURUSD','GBPUSD','USDJPY','ETHUSD','NVDA','AAPL','TSLA','SPY'];
  const setups  = ['Breakout','Pullback','Reversal','VWAP','Support/Resistance','Gap Fill','Scalp'];
  const emotions = ['😊 Confident','😎 Calm','😤 Frustrated','🤔 Uncertain','😃 Excited'];
  const now = new Date();
  S.trades = [];

  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const n = Math.floor(Math.random() * 3) + 1;
    for (let k = 0; k < n; k++) {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const dir = Math.random() > 0.45 ? 'long' : 'short';
      const base = sym === 'BTCUSD' ? 95000 : sym === 'ETHUSD' ? 3500 : sym === 'XAUUSD' ? 2650 : sym === 'NVDA' ? 850 : sym === 'AAPL' ? 190 : sym === 'TSLA' ? 280 : sym === 'SPY' ? 580 : 1.1 + Math.random() * 0.2;
      const entry = parseFloat((base * (1 + (Math.random() - 0.5) * 0.005)).toFixed(sym.includes('USD') && base > 100 ? 2 : 4));
      const win = Math.random() > 0.35;
      const move = (0.003 + Math.random() * 0.025) * (win ? 1 : -1) * (dir === 'long' ? 1 : -1);
      const exit = parseFloat((entry * (1 + move)).toFixed(entry > 100 ? 2 : 4));
      const size = sym === 'BTCUSD' || sym === 'ETHUSD' ? parseFloat((0.01 + Math.random() * 0.09).toFixed(2)) : Math.floor(1 + Math.random() * 20);
      const comm = parseFloat((size * 0.01 + Math.random() * 1.5).toFixed(2));
      const rawPnl = dir === 'long' ? (exit - entry) * size : (entry - exit) * size;
      const pnl = parseFloat((rawPnl - comm).toFixed(2));
      const sl = dir === 'long' ? parseFloat((entry * 0.985).toFixed(entry > 100 ? 2 : 4)) : parseFloat((entry * 1.015).toFixed(entry > 100 ? 2 : 4));
      const risk = Math.abs((entry - sl) * size);
      const rr = risk > 0 ? parseFloat((Math.abs(pnl) / risk).toFixed(2)) : 0;

      S.trades.push({
        id: Date.now() + '' + Math.random(),
        date: d.toISOString().split('T')[0],
        symbol: sym, direction: dir, entry, exit, size, sl,
        tp: dir === 'long' ? parseFloat((entry * 1.03).toFixed(entry > 100 ? 2 : 4)) : parseFloat((entry * 0.97).toFixed(entry > 100 ? 2 : 4)),
        commission: comm, pnl, rr,
        setup: setups[Math.floor(Math.random() * setups.length)],
        timeframe: ['5m','15m','1h','4h'][Math.floor(Math.random() * 4)],
        emotion: emotions[Math.floor(Math.random() * emotions.length)],
        preAnalysis: '', notes: '', lessons: '',
        result: pnl > 2 ? 'win' : pnl < -2 ? 'loss' : 'breakeven',
      });
    }
  }

  S.journals = [
    {
      id: '1', date: new Date().toISOString().split('T')[0],
      symbol: 'XAUUSD', direction: 'long', pnl: 25.12,
      preAnalysis: 'Gold breaking above key resistance at $2648. Volume confirmation. Risk 1% of account.',
      notes: 'Clean breakout entry. Managed the trade well. Partial TP at 1:1, let rest run.',
      lessons: 'Trust the setup when volume confirms. Partial profits reduce stress.',
      emotion: '😎 Calm', rating: 8, tags: 'breakout, trend',
    },
    {
      id: '2', date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      symbol: 'BTCUSD', direction: 'short', pnl: -8.65,
      preAnalysis: 'BTC showing bearish divergence on 1h. Short below support.',
      notes: 'Entered too early before confirmation. Stop hit by spike.',
      lessons: 'Wait for close below level before entry. Spikes can stop you out.',
      emotion: '😤 Frustrated', rating: 4, tags: 'reversal',
    },
  ];

  save();
  showToast('Sample data loaded!', 'info');
}

// ── METRICS ───────────────────────────────────────────────────
function getMetrics(trades) {
  const closed = trades.filter(t => t.exit);
  const wins   = closed.filter(t => t.result === 'win');
  const losses = closed.filter(t => t.result === 'loss');
  const totalPnl = closed.reduce((s, t) => s + t.pnl, 0);
  const gp = wins.reduce((s, t) => s + t.pnl, 0);
  const gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  let peak = 0, dd = 0, run = 0;
  [...closed].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
    run += t.pnl;
    if(run > peak) peak = run;
    const cur = peak > 0 ? ((peak-run)/peak)*100 : 0;
    if(cur > dd) dd = cur;
  });

  let wS=0,lS=0,cW=0,cL=0;
  [...closed].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{
    if(t.result==='win'){cW++;cL=0;if(cW>wS)wS=cW;}
    else{cL++;cW=0;if(cL>lS)lS=cL;}
  });

  return {
    pnl: totalPnl, closed: closed.length, open: trades.filter(t=>!t.exit).length,
    total: trades.length, wins: wins.length, losses: losses.length,
    winRate: closed.length ? (wins.length/closed.length)*100 : 0,
    avgRR: closed.length ? closed.reduce((s,t)=>s+(t.rr||0),0)/closed.length : 0,
    drawdown: dd, pf: gl > 0 ? gp/gl : gp > 0 ? Infinity : 0,
    bestTrade: closed.length ? Math.max(...closed.map(t=>t.pnl)) : 0,
    worstTrade: closed.length ? Math.min(...closed.map(t=>t.pnl)) : 0,
    avgWin: wins.length ? gp/wins.length : 0,
    avgLoss: losses.length ? gl/losses.length : 0,
    winStreak: wS, lossStreak: lS,
    totalComm: trades.reduce((s,t)=>s+(t.commission||0),0),
    expectancy: closed.length ? totalPnl/closed.length : 0,
    grossProfit: gp, grossLoss: gl,
  };
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const m = getMetrics(S.trades);
  const closed = S.trades.filter(t=>t.exit);
  const open   = S.trades.filter(t=>!t.exit);
  const unreal = open.reduce((s,t)=>s+(t.pnl||0),0);
  const real   = closed.reduce((s,t)=>s+t.pnl,0);

  setText('kpi-pnl',       fmt(m.pnl), m.pnl>=0?'green':'red');
  setText('kpi-unrealized', fmt(unreal), unreal>=0?'green':'red');
  setText('kpi-realized',   fmt(real),   real>=0?'green':'red');
  setText('kpi-winrate',    m.winRate.toFixed(1)+'%');
  setText('kpi-pnl-note',  '→ '+m.total+' trades');
  setText('kpi-unrealized-note', open.length+' open positions');
  setText('kpi-realized-note',   closed.length+' closed trades');
  setStyle('winrate-fill','width',m.winRate.toFixed(0)+'%');
  setText('perf-val',  fmt(m.pnl));
  setText('perf-pct',  (m.pnl>=0?'▲':'▼')+' '+Math.abs((m.pnl/S.settings.startingCapital)*100).toFixed(1)+'%');

  renderOpenPositions(open);
  renderTopPerformers();
  drawEquityChart();
}

function setText(id, val, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  if (cls) {
    el.className = el.className.replace(/\bgreen\b|\bred\b/g,'').trim() + ' ' + cls;
  }
}
function setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}
function fmt(n) { return (n>=0?'+':'')+n.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}); }

function renderOpenPositions(open) {
  const tbody = document.getElementById('open-pos-tbody');
  const empty = document.getElementById('open-pos-empty');
  const total = document.getElementById('op-total');
  if (!tbody) return;
  const sumOpen = open.reduce((s,t)=>s+(t.pnl||0),0);
  if (total) total.textContent = 'Total: ' + fmt(sumOpen);
  if (!open.length) {
    tbody.innerHTML=''; if(empty) empty.style.display='block'; return;
  }
  if (empty) empty.style.display='none';
  tbody.innerHTML = open.slice(0,6).map(t=>`
    <tr>
      <td>🟡</td>
      <td><strong>${t.symbol}</strong></td>
      <td><span class="bdg bdg-${t.direction}">${t.direction.toUpperCase()}</span></td>
      <td>$${t.entry.toLocaleString()}</td>
      <td>${t.size}</td>
      <td class="${t.pnl>=0?'pnl-pos':'pnl-neg'}">${t.pnl>=0?'+':''}$${Math.abs(t.pnl).toFixed(2)}</td>
    </tr>`).join('');
}

function renderTopPerformers() {
  const el = document.getElementById('top-performers');
  if (!el) return;
  const symMap = {};
  S.trades.forEach(t=>{ if(!symMap[t.symbol]) symMap[t.symbol]={pnl:0,trades:0}; symMap[t.symbol].pnl+=t.pnl; symMap[t.symbol].trades++; });
  const sorted = Object.entries(symMap).sort((a,b)=>b[1].pnl-a[1].pnl).slice(0,5);
  el.innerHTML = sorted.map(([sym,d])=>`
    <div class="tp-item">
      <div><div class="tp-sym">🟡 ${sym}</div><div class="tp-meta">${d.trades} trades</div></div>
      <div class="tp-pnl ${d.pnl>=0?'pnl-pos':'pnl-neg'}">${d.pnl>=0?'+':''}$${Math.abs(d.pnl).toFixed(2)}</div>
    </div>`).join('');
}

// ── EQUITY CHART ──────────────────────────────────────────────
function drawEquityChart() {
  const ctx = document.getElementById('equityChart');
  if (!ctx) return;
  if (S.charts.equity) { S.charts.equity.destroy(); delete S.charts.equity; }

  const filtered = filterByEquityPeriod(S.trades.filter(t=>t.exit));
  const sorted = [...filtered].sort((a,b)=>a.date.localeCompare(b.date));
  let running = S.settings.startingCapital;
  const labels = ['Start'], values = [running];
  sorted.forEach(t => { running += t.pnl; labels.push(t.date); values.push(parseFloat(running.toFixed(2))); });

  S.charts.equity = new Chart(ctx, {
    type:'line',
    data:{
      labels,
      datasets:[{
        data:values, label:'Equity',
        borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.08)',
        fill:true, tension:0.4, borderWidth:2.5,
        pointRadius: values.length>40?0:3, pointHoverRadius:6, pointBackgroundColor:'#3b82f6',
      }],
    },
    options:{
      responsive:true, interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false}, tooltip:{backgroundColor:'#111e38',borderColor:'#1e2f4a',borderWidth:1,padding:10,callbacks:{label:c=>' $'+c.raw.toLocaleString()}}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{maxTicksLimit:8,color:'#4a5f80',font:{size:10}}},
        y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10},callback:v=>'$'+v.toLocaleString()}},
      },
    },
  });
}

function filterByEquityPeriod(trades) {
  const now = new Date();
  return trades.filter(t => {
    const d = new Date(t.date);
    if (S.equityFilter==='1d') return d.toDateString()===now.toDateString();
    if (S.equityFilter==='1w') return d >= new Date(now-7*864e5);
    if (S.equityFilter==='1m') return d >= new Date(now.getFullYear(),now.getMonth()-1,now.getDate());
    if (S.equityFilter==='3m') return d >= new Date(now.getFullYear(),now.getMonth()-3,now.getDate());
    return true;
  });
}

function setEquityFilter(f, btn) {
  S.equityFilter = f;
  document.querySelectorAll('.pf-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  drawEquityChart();
}

// ── MINI CALENDAR ─────────────────────────────────────────────
function renderMiniCal() {
  const grid = document.getElementById('mini-cal');
  const label = document.getElementById('cal-month-label');
  if (!grid) return;
  const y = S.calYear, mo = S.calMonth;
  if (label) label.textContent = new Date(y,mo,1).toLocaleString('default',{month:'long',year:'numeric'});
  const firstDay = new Date(y,mo,1).getDay() || 7;
  const days = new Date(y,mo+1,0).getDate();
  const today = new Date().toISOString().split('T')[0];
  const pnlMap = {};
  S.trades.forEach(t=>{
    if(t.date.startsWith(`${y}-${String(mo+1).padStart(2,'0')}`)){
      if(!pnlMap[t.date]) pnlMap[t.date]=0;
      pnlMap[t.date]+=t.pnl;
    }
  });
  const headers = ['M','T','W','T','F','S','S'].map(h=>`<div class="ch">${h}</div>`).join('');
  let cells = '';
  for(let i=1;i<firstDay;i++) cells+=`<div class="cd"></div>`;
  for(let d=1;d<=days;d++){
    const ds = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const p = pnlMap[ds];
    const cls = ds===today?'today':p>0?'profit':p<0?'loss':'';
    const small = p!==undefined?`<small>${p>=0?'+':''}$${Math.abs(p).toFixed(0)}</small>`:'';
    cells+=`<div class="cd ${cls}">${d}${small}</div>`;
  }
  grid.innerHTML = headers + cells;
}

function changeCalMonth(d) {
  S.calMonth += d;
  if(S.calMonth>11){S.calMonth=0;S.calYear++;}
  if(S.calMonth<0){S.calMonth=11;S.calYear--;}
  renderMiniCal();
}

// ── MOCK CHARTS (Landing page) ────────────────────────────────
function initMockChart() {
  const ctx = document.getElementById('mockChart');
  if(!ctx) return;
  const labels = ['Jan 21','Jan 22','Jan 23','Jan 24','Jan 25','Jan 26','Jan 27'];
  const data = [-480, -200, 400, 800, 1400, 2300, 4900];
  new Chart(ctx,{
    type:'line',
    data:{labels,datasets:[{data,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.08)',fill:true,tension:0.4,borderWidth:2,pointRadius:2,pointHoverRadius:5,pointBackgroundColor:'#3b82f6'}]},
    options:{
      responsive:true,
      plugins:{legend:{display:false},tooltip:{backgroundColor:'#111e38',borderColor:'#1e2f4a',borderWidth:1}},
      scales:{
        x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:9}}},
        y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:9},callback:v=>'$'+v}},
      },
    },
  });
}

function initApChart() {
  const ctx = document.getElementById('apChart');
  if(!ctx) return;
  const data = [9900,9920,9960,9940,9970,9990,10057];
  new Chart(ctx,{
    type:'line',
    data:{labels:['','','','','','',''],datasets:[{data,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.15)',fill:true,tension:0.4,borderWidth:1.5,pointRadius:0}]},
    options:{
      responsive:true,
      plugins:{legend:{display:false},tooltip:{enabled:false}},
      scales:{x:{display:false},y:{display:false}},
    },
  });
}

// ── TRADES TABLE ──────────────────────────────────────────────
function renderTrades() {
  // populate symbol filter
  const symSel = document.getElementById('f-symbol');
  const curSym = symSel ? symSel.value : 'all';
  if (symSel) {
    const syms = [...new Set(S.trades.map(t=>t.symbol))].sort();
    symSel.innerHTML = '<option value="all">All Symbols</option>' + syms.map(s=>`<option value="${s}" ${s===curSym?'selected':''}>${s}</option>`).join('');
  }

  let trades = S.trades.filter(t => {
    const dir = document.getElementById('f-direction')?.value || 'all';
    const res = document.getElementById('f-result')?.value || 'all';
    const sym = document.getElementById('f-symbol')?.value || 'all';
    const from = document.getElementById('f-from')?.value || '';
    const to   = document.getElementById('f-to')?.value || '';
    const q    = (document.getElementById('global-search')?.value || '').toLowerCase();
    return (dir==='all'||t.direction===dir) && (res==='all'||t.result===res) && (sym==='all'||t.symbol===sym) && (!from||t.date>=from) && (!to||t.date<=to) && (!q||t.symbol.toLowerCase().includes(q)||(t.setup||'').toLowerCase().includes(q));
  });

  trades = [...trades].sort((a,b)=>{
    let va=a[S.sort.key], vb=b[S.sort.key];
    if(typeof va==='string'){va=va.toLowerCase();vb=vb.toLowerCase();}
    return S.sort.dir==='asc'?(va<vb?-1:va>vb?1:0):(va>vb?-1:va<vb?1:0);
  });

  const total = trades.length;
  const pages = Math.ceil(total/S.pageSize);
  const start = (S.page-1)*S.pageSize;
  const slice = trades.slice(start, start+S.pageSize);

  const tbody = document.getElementById('trades-tbody');
  const empty = document.getElementById('trades-empty');
  if (!tbody) return;

  if (!total) {
    tbody.innerHTML='';
    if (empty) empty.style.display='flex';
    document.getElementById('trades-count').textContent='0 trades';
    document.getElementById('pagination').innerHTML='';
    return;
  }
  if (empty) empty.style.display='none';
  document.getElementById('trades-count').textContent=`${total} trade${total!==1?'s':''}`;

  tbody.innerHTML = slice.map(t=>`
    <tr>
      <td>${t.date}</td>
      <td><strong>${t.symbol}</strong></td>
      <td><span class="bdg bdg-${t.direction}">${t.direction.toUpperCase()}</span></td>
      <td>$${Number(t.entry).toLocaleString()}</td>
      <td>${t.exit?'$'+Number(t.exit).toLocaleString():'<span style="color:var(--text3)">Open</span>'}</td>
      <td>${t.size}</td>
      <td class="${t.pnl>=0?'pnl-pos':'pnl-neg'}">${t.pnl>=0?'+':''}$${Math.abs(t.pnl).toFixed(2)}</td>
      <td>${t.rr?'1:'+t.rr.toFixed(1):'—'}</td>
      <td><span style="color:var(--text3);font-size:11px">${t.setup||'—'}</span></td>
      <td><span class="bdg bdg-${t.result}">${t.result.toUpperCase()}</span></td>
      <td>
        <button class="act-btn" onclick="editTrade('${t.id}')" title="Edit">✏️</button>
        <button class="act-btn" onclick="deleteTrade('${t.id}')" title="Delete">🗑️</button>
      </td>
    </tr>`).join('');

  let pgHtml='';
  for(let i=1;i<=pages;i++) pgHtml+=`<button class="pg-btn${i===S.page?' active':''}" onclick="goPage(${i})">${i}</button>`;
  document.getElementById('pagination').innerHTML=pgHtml;
}

function sortBy(k) {
  if(S.sort.key===k) S.sort.dir=S.sort.dir==='asc'?'desc':'asc';
  else{S.sort.key=k;S.sort.dir='desc';}
  S.page=1; renderTrades();
}
function goPage(n){S.page=n;renderTrades();}

// ── TRADE MODAL ───────────────────────────────────────────────
function openAddTrade() {
  document.getElementById('modal-title').textContent='Add Trade';
  document.getElementById('t-id').value='';
  ['t-symbol','t-entry','t-exit','t-size','t-sl','t-tp','t-pre','t-notes','t-lessons'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('t-comm').value='0';
  document.getElementById('t-dir').value='long';
  document.getElementById('t-setup').value='';
  document.getElementById('t-tf').value='1h';
  document.getElementById('t-emo').value='';
  setToday();
  calcPreview();
  document.getElementById('trade-modal').classList.add('active');
}

function editTrade(id) {
  const t = S.trades.find(x=>x.id==id);
  if(!t) return;
  document.getElementById('modal-title').textContent='Edit Trade';
  document.getElementById('t-id').value=t.id;
  document.getElementById('t-symbol').value=t.symbol;
  document.getElementById('t-date').value=t.date;
  document.getElementById('t-dir').value=t.direction;
  document.getElementById('t-entry').value=t.entry;
  document.getElementById('t-exit').value=t.exit||'';
  document.getElementById('t-size').value=t.size;
  document.getElementById('t-sl').value=t.sl||'';
  document.getElementById('t-tp').value=t.tp||'';
  document.getElementById('t-comm').value=t.commission||0;
  document.getElementById('t-setup').value=t.setup||'';
  document.getElementById('t-tf').value=t.timeframe||'1h';
  document.getElementById('t-emo').value=t.emotion||'';
  document.getElementById('t-pre').value=t.preAnalysis||'';
  document.getElementById('t-notes').value=t.notes||'';
  document.getElementById('t-lessons').value=t.lessons||'';
  calcPreview();
  document.getElementById('trade-modal').classList.add('active');
}

function saveTrade() {
  const sym  = document.getElementById('t-symbol').value.trim().toUpperCase();
  const date = document.getElementById('t-date').value;
  const entry= parseFloat(document.getElementById('t-entry').value);
  const size = parseFloat(document.getElementById('t-size').value);
  if(!sym||!date||!entry||!size){showToast('Fill required fields: Symbol, Date, Entry, Size','error');return;}

  const exit = parseFloat(document.getElementById('t-exit').value)||null;
  const dir  = document.getElementById('t-dir').value;
  const sl   = parseFloat(document.getElementById('t-sl').value)||null;
  const tp   = parseFloat(document.getElementById('t-tp').value)||null;
  const comm = parseFloat(document.getElementById('t-comm').value)||0;

  let pnl=0, rr=0, result='open';
  if(exit){
    const raw = dir==='long'?(exit-entry)*size:(entry-exit)*size;
    pnl = parseFloat((raw-comm).toFixed(2));
    result = pnl>2?'win':pnl<-2?'loss':'breakeven';
    if(sl){const risk=Math.abs(entry-sl)*size;rr=risk>0?parseFloat((Math.abs(pnl)/risk).toFixed(2)):0;}
  }

  const id = document.getElementById('t-id').value;
  const trade = {
    id: id||(Date.now()+''+Math.random()), date, symbol:sym, direction:dir,
    entry, exit, size, sl, tp, commission:comm, pnl, rr,
    setup:document.getElementById('t-setup').value,
    timeframe:document.getElementById('t-tf').value,
    emotion:document.getElementById('t-emo').value,
    preAnalysis:document.getElementById('t-pre').value,
    notes:document.getElementById('t-notes').value,
    lessons:document.getElementById('t-lessons').value,
    result,
  };

  if(id){const i=S.trades.findIndex(t=>t.id==id);if(i!==-1)S.trades[i]=trade;}
  else S.trades.push(trade);
  save(); closeTradeModal();
  renderDashboard(); renderTrades(); renderMiniCal(); renderJournalPanel();
  showToast(id?'Trade updated!':'Trade added!','success');
}

function deleteTrade(id){
  if(!confirm('Delete this trade?')) return;
  S.trades=S.trades.filter(t=>t.id!=id);
  save(); renderDashboard(); renderTrades(); renderMiniCal();
  showToast('Trade deleted.','info');
}

function calcPreview() {
  const entry=parseFloat(document.getElementById('t-entry').value);
  const exit =parseFloat(document.getElementById('t-exit').value);
  const size =parseFloat(document.getElementById('t-size').value);
  const sl   =parseFloat(document.getElementById('t-sl').value);
  const comm =parseFloat(document.getElementById('t-comm').value)||0;
  const dir  =document.getElementById('t-dir').value;

  const ppPnl=document.getElementById('pp-pnl');
  const ppRisk=document.getElementById('pp-risk');
  const ppRR=document.getElementById('pp-rr');
  const ppRes=document.getElementById('pp-result');
  if(!ppPnl) return;

  if(entry&&size&&exit){
    const raw=dir==='long'?(exit-entry)*size:(entry-exit)*size;
    const pnl=raw-comm;
    ppPnl.textContent=(pnl>=0?'+':'')+' $'+Math.abs(pnl).toFixed(2);
    ppPnl.style.color=pnl>=0?'var(--green)':'var(--red)';
    ppRes.textContent=pnl>2?'WIN':pnl<-2?'LOSS':'BREAKEVEN';
    ppRes.style.color=pnl>2?'var(--green)':pnl<-2?'var(--red)':'var(--orange)';
    if(sl){const risk=Math.abs(entry-sl)*size;ppRisk.textContent='$'+risk.toFixed(2);ppRR.textContent='1:'+(risk>0?(Math.abs(pnl)/risk).toFixed(2):'—');}
  } else {
    ppPnl.textContent='$0.00'; ppPnl.style.color='';
    ppRisk.textContent='$0.00'; ppRR.textContent='—'; ppRes.textContent='—'; ppRes.style.color='';
  }
}

function closeTradeModal(){document.getElementById('trade-modal').classList.remove('active');}
function backdropClose(e){if(e.target.classList.contains('modal-overlay')) closeTradeModal();}
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeTradeModal();});

// ── JOURNAL ───────────────────────────────────────────────────
function renderJournalPanel() {
  const el = document.getElementById('journal-list-panel');
  if (!el) return;
  const items = [...S.journals].sort((a,b)=>b.date.localeCompare(a.date));
  if (!items.length) {
    el.innerHTML='<p style="color:var(--text3);font-size:12px;padding:12px;">No journal entries yet.</p>';
    return;
  }
  el.innerHTML = items.map(j=>`
    <div class="jl-item" onclick="viewJournal('${j.id}')">
      <div class="jl-sym">🟡 ${j.symbol} <span class="bdg bdg-${j.direction}">${j.direction?j.direction.toUpperCase():''}</span> ${j.pnl>=0?`<span class="pnl-pos">+$${j.pnl.toFixed(2)}</span>`:`<span class="pnl-neg">-$${Math.abs(j.pnl).toFixed(2)}</span>`}</div>
      <div class="jl-meta ${j.pnl>=0?'pnl-pos':'pnl-neg'}">${j.preAnalysis?j.preAnalysis.substring(0,40)+'...':j.notes?j.notes.substring(0,40)+'...':'No analysis'}</div>
      <div class="jl-date">${j.date}</div>
    </div>`).join('');
}

function viewJournal(id) {
  const j = S.journals.find(x=>x.id==id);
  if (!j) return;
  document.querySelectorAll('.jl-item').forEach(e=>e.classList.remove('active'));
  document.querySelector(`.jl-item[onclick*="${id}"]`)?.classList.add('active');

  document.getElementById('journal-right').innerHTML = `
    <div class="journal-entry-view">
      <h2>🟡 ${j.symbol} <span class="bdg bdg-${j.direction}">${j.direction?.toUpperCase()||''}</span> <span class="${j.pnl>=0?'pnl-pos':'pnl-neg'}">${j.pnl>=0?'+':''}$${Math.abs(j.pnl).toFixed(2)}</span></h2>
      <div class="je-meta"><span>📅 ${j.date}</span>${j.emotion?`<span>${j.emotion}</span>`:''}<span>⭐ ${j.rating||0}/10</span>${j.tags?`<span>🏷 ${j.tags}</span>`:''}</div>
      ${j.preAnalysis?`<div class="je-section"><h4>Pre-Trade Analysis</h4><p>${j.preAnalysis}</p></div>`:''}
      ${j.notes?`<div class="je-section"><h4>Post-Trade Review</h4><p>${j.notes}</p></div>`:''}
      ${j.lessons?`<div class="je-section"><h4>Lessons Learned</h4><p>${j.lessons}</p></div>`:''}
      <div class="je-actions">
        <button class="tb-btn" onclick="editJournal('${j.id}')">✏️ Edit</button>
        <button class="tb-btn danger" onclick="deleteJournal('${j.id}')">🗑 Delete</button>
      </div>
    </div>`;
}

function openAddJournal() {
  const j = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], symbol: 'XAUUSD', direction: 'long', pnl: 0, preAnalysis: '', notes: '', lessons: '', emotion: '', rating: 5, tags: '' };
  S.journals.push(j);
  save(); renderJournalPanel(); viewJournal(j.id); editJournal(j.id);
}

function editJournal(id) {
  const j = S.journals.find(x=>x.id==id);
  if (!j) return;
  document.getElementById('journal-right').innerHTML = `
    <div class="journal-entry-view">
      <div class="form-row" style="margin-bottom:12px">
        <div class="fg"><label>Symbol</label><input class="fi" id="jed-sym" value="${j.symbol||''}" /></div>
        <div class="fg"><label>Direction</label><select class="fi" id="jed-dir"><option value="long" ${j.direction==='long'?'selected':''}>Long</option><option value="short" ${j.direction==='short'?'selected':''}>Short</option></select></div>
        <div class="fg"><label>P&L ($)</label><input class="fi" id="jed-pnl" type="number" step="0.01" value="${j.pnl||0}" /></div>
      </div>
      <div class="form-row" style="margin-bottom:12px">
        <div class="fg"><label>Date</label><input class="fi" id="jed-date" type="date" value="${j.date}" /></div>
        <div class="fg"><label>Emotion</label><input class="fi" id="jed-emo" value="${j.emotion||''}" placeholder="Calm, nervous..." /></div>
        <div class="fg"><label>Rating (1-10)</label><input class="fi" id="jed-rating" type="number" min="1" max="10" value="${j.rating||5}" /></div>
      </div>
      <div class="fg full" style="margin-bottom:10px"><label>Tags</label><input class="fi" id="jed-tags" value="${j.tags||''}" placeholder="breakout, trend, news (comma separated)" /></div>
      <div class="fg full" style="margin-bottom:10px"><label>Pre-Trade Analysis</label><textarea class="fi" id="jed-pre" rows="3">${j.preAnalysis||''}</textarea></div>
      <div class="fg full" style="margin-bottom:10px"><label>Post-Trade Review</label><textarea class="fi" id="jed-notes" rows="4">${j.notes||''}</textarea></div>
      <div class="fg full" style="margin-bottom:16px"><label>Lessons Learned</label><textarea class="fi" id="jed-lessons" rows="3">${j.lessons||''}</textarea></div>
      <div style="display:flex;gap:8px">
        <button class="tb-btn primary" onclick="saveJournal('${j.id}')">💾 Save</button>
        <button class="tb-btn" onclick="viewJournal('${j.id}')">Cancel</button>
      </div>
    </div>`;
}

function saveJournal(id) {
  const idx = S.journals.findIndex(x=>x.id==id);
  if (idx===-1) return;
  S.journals[idx] = {
    ...S.journals[idx],
    symbol: document.getElementById('jed-sym').value.toUpperCase(),
    direction: document.getElementById('jed-dir').value,
    pnl: parseFloat(document.getElementById('jed-pnl').value)||0,
    date: document.getElementById('jed-date').value,
    emotion: document.getElementById('jed-emo').value,
    rating: parseInt(document.getElementById('jed-rating').value)||5,
    tags: document.getElementById('jed-tags').value,
    preAnalysis: document.getElementById('jed-pre').value,
    notes: document.getElementById('jed-notes').value,
    lessons: document.getElementById('jed-lessons').value,
  };
  save(); renderJournalPanel(); viewJournal(id);
  showToast('Journal saved!','success');
}

function deleteJournal(id) {
  if(!confirm('Delete this journal entry?')) return;
  S.journals = S.journals.filter(j=>j.id!=id);
  save(); renderJournalPanel();
  document.getElementById('journal-right').innerHTML = `<div class="journal-placeholder"><span>📖</span><h3>Select a trade to journal</h3><p>Choose a trade or create a new entry.</p><button class="tb-btn primary" onclick="openAddJournal()">+ New Journal Entry</button></div>`;
  showToast('Entry deleted.','info');
}

// ── ANALYTICS ─────────────────────────────────────────────────
function setAnFilter(f, btn) {
  S.anFilter = f;
  document.querySelectorAll('.an-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  updateAnalytics();
  setTimeout(drawAnalyticsCharts, 80);
}

function getFilteredTrades() {
  const now = new Date();
  return S.trades.filter(t=>{
    const d = new Date(t.date);
    if(S.anFilter==='today') return d.toDateString()===now.toDateString();
    if(S.anFilter==='7d') return d>=new Date(now-7*864e5);
    if(S.anFilter==='30d') return d>=new Date(now-30*864e5);
    if(S.anFilter==='3m') return d>=new Date(now.getFullYear(),now.getMonth()-3,now.getDate());
    if(S.anFilter==='1y') return d>=new Date(now.getFullYear()-1,now.getMonth(),now.getDate());
    return true;
  });
}

function updateAnalytics() {
  const trades = getFilteredTrades();
  const m = getMetrics(trades);
  setText('an-pnl', (m.pnl>=0?'+':'')+'$'+Math.abs(m.pnl).toFixed(2), m.pnl>=0?'green':'red');
  setText('an-wr', m.winRate.toFixed(1)+'%');
  setText('an-pf', isFinite(m.pf)?m.pf.toFixed(2):'∞');
  setText('an-exp', (m.expectancy>=0?'+':'')+'$'+Math.abs(m.expectancy).toFixed(2));

  const qg = document.getElementById('qs-grid');
  if (qg) {
    qg.innerHTML = [
      ['AVG WINNER',   `+$${m.avgWin.toFixed(2)}`,  'green'],
      ['AVG LOSER',    `-$${m.avgLoss.toFixed(2)}`,  'red'],
      ['BEST TRADE',   `+$${m.bestTrade.toFixed(2)}`, 'green'],
      ['WORST TRADE',  `-$${Math.abs(m.worstTrade).toFixed(2)}`, 'red'],
      ['WIN STREAK',   m.winStreak+' trades',         ''],
      ['LOSE STREAK',  m.lossStreak+' trades',        'red'],
      ['RISK/REWARD',  '1:'+m.avgRR.toFixed(2),       ''],
      ['WIN TRADES',   m.wins,                         ''],
    ].map(([l,v,c])=>`<div class="qs-item"><span>${l}</span><strong class="${c}">${v}</strong></div>`).join('');
  }
}

function drawAnalyticsCharts() {
  const trades = getFilteredTrades();
  const closed = trades.filter(t=>t.exit);
  const chDefs = [
    ['an-equity', drawAnEquity.bind(null, closed)],
    ['an-ls', drawLongShort.bind(null, closed)],
    ['an-dow', drawDow.bind(null, closed)],
    ['an-sym', drawSymbols.bind(null, closed)],
    ['an-monthly', drawMonthly.bind(null, closed)],
    ['an-dist', drawDist.bind(null, closed)],
  ];
  chDefs.forEach(([id, fn]) => {
    if (S.charts[id]) { S.charts[id].destroy(); delete S.charts[id]; }
    S.charts[id] = fn(id);
  });
}

function drawAnEquity(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const sorted = [...closed].sort((a,b)=>a.date.localeCompare(b.date));
  let r = S.settings.startingCapital;
  const labels=['Start'], vals=[r];
  sorted.forEach(t=>{r+=t.pnl;labels.push(t.date);vals.push(parseFloat(r.toFixed(2)));});
  return new Chart(ctx,{type:'line',data:{labels,datasets:[{data:vals,borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.08)',fill:true,tension:0.4,borderWidth:2,pointRadius:0}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{backgroundColor:'#111e38',borderColor:'#1e2f4a',borderWidth:1}},scales:{x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{maxTicksLimit:6,color:'#4a5f80',font:{size:9}}},y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:9},callback:v=>'$'+v.toLocaleString()}}}}});
}
function drawLongShort(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const lp = closed.filter(t=>t.direction==='long').reduce((s,t)=>s+t.pnl,0);
  const sp = closed.filter(t=>t.direction==='short').reduce((s,t)=>s+t.pnl,0);
  return new Chart(ctx,{type:'bar',data:{labels:['Long','Short'],datasets:[{data:[parseFloat(lp.toFixed(2)),parseFloat(sp.toFixed(2))],backgroundColor:[lp>=0?'rgba(0,230,118,0.7)':'rgba(255,68,68,0.7)',sp>=0?'rgba(0,230,118,0.7)':'rgba(255,68,68,0.7)'],borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#4a5f80',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10},callback:v=>'$'+v}}}}});
}
function drawDow(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dow=new Array(7).fill(0);
  closed.forEach(t=>{const d=new Date(t.date+'T12:00:00');dow[d.getDay()]+=t.pnl;});
  return new Chart(ctx,{type:'bar',data:{labels:days,datasets:[{data:dow.map(v=>parseFloat(v.toFixed(2))),backgroundColor:dow.map(v=>v>=0?'rgba(59,130,246,0.7)':'rgba(255,68,68,0.7)'),borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#4a5f80',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10},callback:v=>'$'+v}}}}});
}
function drawSymbols(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const map={};
  closed.forEach(t=>{if(!map[t.symbol])map[t.symbol]=0;map[t.symbol]+=t.pnl;});
  const s=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6);
  return new Chart(ctx,{type:'bar',data:{labels:s.map(x=>x[0]),datasets:[{data:s.map(x=>parseFloat(x[1].toFixed(2))),backgroundColor:s.map(x=>x[1]>=0?'rgba(0,230,118,0.7)':'rgba(255,68,68,0.7)'),borderRadius:4}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10},callback:v=>'$'+v}},y:{grid:{display:false},ticks:{color:'#4a5f80',font:{size:10}}}}}});
}
function drawMonthly(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const map={};
  closed.forEach(t=>{const k=t.date.slice(0,7);if(!map[k])map[k]=0;map[k]+=t.pnl;});
  const s=Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  return new Chart(ctx,{type:'bar',data:{labels:s.map(x=>x[0]),datasets:[{data:s.map(x=>parseFloat(x[1].toFixed(2))),backgroundColor:s.map(x=>x[1]>=0?'rgba(59,130,246,0.7)':'rgba(255,68,68,0.7)'),borderRadius:5}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{backgroundColor:'#111e38',borderColor:'#1e2f4a',borderWidth:1}},scales:{x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10},callback:v=>'$'+v}}}}});
}
function drawDist(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  if(!closed.length) return;
  const pnls=closed.map(t=>t.pnl);
  const min=Math.min(...pnls),max=Math.max(...pnls),bins=16;
  const size=(max-min)/bins;
  const counts=new Array(bins).fill(0);
  const labels=[];
  for(let i=0;i<bins;i++)labels.push('$'+(min+i*size).toFixed(0));
  pnls.forEach(p=>{const i=Math.min(Math.floor((p-min)/size),bins-1);counts[i]++;});
  return new Chart(ctx,{type:'bar',data:{labels,datasets:[{data:counts,backgroundColor:labels.map(l=>parseFloat(l.replace('$',''))>=0?'rgba(0,230,118,0.7)':'rgba(255,68,68,0.7)'),borderRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#4a5f80',font:{size:9},maxTicksLimit:8}},y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:9}}}}}});
}

function drawTradeAnalysisCharts() {
  const closed = S.trades.filter(t=>t.exit);
  const charts = [
    ['an-setup', drawSetup.bind(null, closed)],
    ['an-wl', drawWL.bind(null, closed)],
    ['an-session', drawSession.bind(null, closed)],
    ['an-rr', drawRRChart.bind(null, closed)],
  ];
  charts.forEach(([id, fn]) => {
    if (S.charts[id]) { S.charts[id].destroy(); delete S.charts[id]; }
    S.charts[id] = fn(id);
  });
}

function drawSetup(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const map={};
  closed.forEach(t=>{if(!t.setup)return;if(!map[t.setup])map[t.setup]=0;map[t.setup]+=t.pnl;});
  const s=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  return new Chart(ctx,{type:'bar',data:{labels:s.map(x=>x[0]),datasets:[{data:s.map(x=>parseFloat(x[1].toFixed(2))),backgroundColor:s.map(x=>x[1]>=0?'rgba(59,130,246,0.7)':'rgba(255,68,68,0.7)'),borderRadius:5}]},options:{responsive:true,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10},callback:v=>'$'+v}},y:{grid:{display:false},ticks:{color:'#4a5f80',font:{size:10}}}}}});
}
function drawWL(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const w=closed.filter(t=>t.result==='win').length;
  const l=closed.filter(t=>t.result==='loss').length;
  const b=closed.filter(t=>t.result==='breakeven').length;
  return new Chart(ctx,{type:'doughnut',data:{labels:['Win','Loss','Breakeven'],datasets:[{data:[w,l,b],backgroundColor:['rgba(0,230,118,0.8)','rgba(255,68,68,0.8)','rgba(245,158,11,0.8)'],borderColor:['#00e676','#ff4444','#f59e0b'],borderWidth:2}]},options:{responsive:true,cutout:'70%',plugins:{legend:{position:'bottom',labels:{padding:10,boxWidth:10,color:'#8899bb',font:{size:10}}},tooltip:{backgroundColor:'#111e38',borderColor:'#1e2f4a',borderWidth:1}}}});
}
function drawSession(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const ses={'Asian':0,'London':0,'New York':0,'London-NY':0};
  closed.forEach(t=>{const h=new Date(t.date+'T12:00:00').getHours();if(h>=0&&h<8)ses['Asian']+=t.pnl;else if(h>=8&&h<13)ses['London']+=t.pnl;else if(h>=13&&h<17)ses['New York']+=t.pnl;else ses['London-NY']+=t.pnl;});
  const s=Object.entries(ses);
  return new Chart(ctx,{type:'bar',data:{labels:s.map(x=>x[0]),datasets:[{data:s.map(x=>parseFloat(x[1].toFixed(2))),backgroundColor:s.map(x=>x[1]>=0?'rgba(59,130,246,0.7)':'rgba(255,68,68,0.7)'),borderRadius:5}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#4a5f80',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10},callback:v=>'$'+v}}}}});
}
function drawRRChart(closed, id) {
  const ctx = document.getElementById(id); if (!ctx) return;
  const buckets={'<0.5':0,'0.5-1':0,'1-2':0,'2-3':0,'>3':0};
  closed.forEach(t=>{const r=t.rr||0;if(r<0.5)buckets['<0.5']++;else if(r<1)buckets['0.5-1']++;else if(r<2)buckets['1-2']++;else if(r<3)buckets['2-3']++;else buckets['>3']++;});
  return new Chart(ctx,{type:'bar',data:{labels:Object.keys(buckets),datasets:[{data:Object.values(buckets),backgroundColor:'rgba(59,130,246,0.7)',borderRadius:5}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#4a5f80',font:{size:10}}},y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#4a5f80',font:{size:10}}}}}});
}

// ── LEADERBOARD ───────────────────────────────────────────────
function renderLeaderboard() {
  const el = document.getElementById('lb-tbody');
  if (!el) return;
  const fake = [
    {n:'RK (You)',pnl:12450.32,wr:68.4,trades:247},
    {n:'Alex K.',pnl:9823.10,wr:71.2,trades:182},
    {n:'James P.',pnl:7654.80,wr:65.0,trades:310},
    {n:'Sara R.',pnl:6234.50,wr:62.1,trades:198},
    {n:'Mike T.',pnl:5890.20,wr:59.8,trades:421},
    {n:'Ana M.',pnl:4312.00,wr:70.5,trades:134},
    {n:'Chris W.',pnl:3241.40,wr:55.3,trades:267},
    {n:'Priya N.',pnl:2890.60,wr:63.7,trades:156},
  ];
  el.innerHTML = fake.map((r,i)=>`
    <tr>
      <td><strong>${i+1}</strong>${i===0?' 🥇':i===1?' 🥈':i===2?' 🥉':''}</td>
      <td>${r.n}</td>
      <td class="pnl-pos">+$${r.pnl.toLocaleString('en-US',{minimumFractionDigits:2})}</td>
      <td>${r.wr}%</td>
      <td>${r.trades}</td>
    </tr>`).join('');
}

// ── EXPORT ────────────────────────────────────────────────────
function exportCSV() {
  const hdr = ['Date','Symbol','Direction','Entry','Exit','Size','PnL','R:R','Setup','Timeframe','Result','Notes'];
  const rows = S.trades.map(t=>[t.date,t.symbol,t.direction,t.entry,t.exit||'',t.size,t.pnl.toFixed(2),t.rr||'',t.setup||'',t.timeframe||'',t.result,(t.notes||'').replace(/,/g,'')]);
  const csv = [hdr,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='tradefg_trades.csv'; a.click();
  showToast('Exported to CSV!','success');
}

// ── SETTINGS ─────────────────────────────────────────────────
function saveSettings() {
  S.settings.startingCapital = parseFloat(document.getElementById('s-capital')?.value)||10000;
  save(); renderDashboard(); showToast('Settings saved!','success');
}
function clearAll() {
  if(!confirm('Clear ALL data? This cannot be undone.')) return;
  S.trades=[]; S.journals=[]; save();
  renderDashboard(); renderTrades(); renderMiniCal(); renderJournalPanel();
  updateAnalytics();
  showToast('All data cleared.','info');
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 3000);
}

// Initialize Chart.js defaults
Chart.defaults.color = '#8899bb';
Chart.defaults.borderColor = '#1e2f4a';
Chart.defaults.font.family = 'Inter';
