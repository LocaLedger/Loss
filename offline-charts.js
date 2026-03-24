/* ================================
   LOCALOSS — PURE CSS/HTML CHARTS
   Offline spending charts for LocaLoss.
   Reads from global loadData() and dateFilter.
================================= */

// ROSE is declared in index.html — do not redeclare here
const CHART_COLORS = ['#F43F5E','#F97316','#8B5CF6','#06B6D4','#10B981','#EAB308','#94A3B8'];

function _getLossData() {
  try {
    const data = loadData();
    let expenses = (data.expenses || []).filter(e => !e.deleted);

    if (typeof dateFilter !== 'undefined') {
      const today = new Date();
      const yr = today.getFullYear();
      const mo = today.getMonth();
      let s, en;

      if (dateFilter.type === 'month') {
        s  = new Date(yr, mo, 1).toISOString().split('T')[0];
        en = new Date(yr, mo + 1, 0).toISOString().split('T')[0];
      } else if (dateFilter.type === 'ytd') {
        s  = new Date(yr, 0, 1).toISOString().split('T')[0];
        en = today.toISOString().split('T')[0];
      } else if (dateFilter.type === 'past3months') {
        s  = new Date(yr, mo - 3, 1).toISOString().split('T')[0];
        en = today.toISOString().split('T')[0];
      } else if (dateFilter.type === 'range' && dateFilter.startDate && dateFilter.endDate) {
        s  = dateFilter.startDate;
        en = dateFilter.endDate;
      } else if (dateFilter.type === 'week') {
        const day = today.getDay();
        const mon = new Date(today); mon.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
        s  = mon.toISOString().split('T')[0];
        en = today.toISOString().split('T')[0];
      }
      if (s && en) expenses = expenses.filter(e => e.date >= s && e.date <= en);
    }
    return { expenses, data };
  } catch(err) {
    return { expenses: [], data: {} };
  }
}

function _getCategoryColor(key, cats, idx) {
  const cat = (cats || []).find(c => c.key === key);
  if (cat && cat.color) return cat.color;
  return CHART_COLORS[idx % CHART_COLORS.length];
}

function _getCategoryLabel(key, cats) {
  const cat = (cats || []).find(c => c.key === key);
  return cat ? cat.label : (key || 'Other');
}

function renderOfflineCharts() {
  const view = window.currentChartView || 'category';
  const { expenses, data } = _getLossData();
  const cats = data.categories || [];

  const containers = ['lossCategoryChart','lossMerchantChart','lossTrendChart'];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  });

  if (!expenses.length) { showEmptyChartState(); return; }

  let containerId, html = '';

  if (view === 'category') {
    containerId = 'lossCategoryChart';
    const totals = {};
    expenses.forEach(e => {
      const k = e.category || 'other';
      totals[k] = (totals[k] || 0) + (parseFloat(e.amount) || 0);
    });
    const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,7);
    const grand  = sorted.reduce((s,[,v]) => s+v, 0);
    html = `<div class="text-center text-2xl font-bold mb-4" style="color:#f1f5f9">$${grand.toFixed(2)}</div>`;
    sorted.forEach(([key, val], i) => {
      const pct   = grand ? ((val/grand)*100).toFixed(0) : 0;
      const width = grand ? (val/grand)*100 : 0;
      const color = _getCategoryColor(key, cats, i);
      const label = _getCategoryLabel(key, cats);
      html += `
        <div class="mb-3">
          <div class="flex justify-between text-sm mb-1">
            <span class="flex items-center gap-2">
              <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
              <span class="text-gray-300">${label}</span>
            </span>
            <span class="text-gray-400">$${val.toFixed(2)} <span class="text-gray-600">(${pct}%)</span></span>
          </div>
          <div class="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full rounded-full" style="width:${width}%;background:${color}"></div>
          </div>
        </div>`;
    });

  } else if (view === 'merchant') {
    containerId = 'lossMerchantChart';
    const totals = {};
    expenses.forEach(e => {
      const m = (e.merchant || 'Unknown').trim();
      totals[m] = (totals[m] || 0) + (parseFloat(e.amount) || 0);
    });
    const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,8);
    const max = sorted[0]?.[1] || 1;
    html = `<div class="text-xs text-gray-500 uppercase tracking-widest mb-3" style="font-family:'Space Mono',monospace">Top Merchants</div>`;
    sorted.forEach(([merchant, val], i) => {
      const width = (val/max)*100;
      html += `
        <div class="mb-3">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-300 truncate" style="max-width:65%">${merchant}</span>
            <span class="text-gray-400">$${val.toFixed(2)}</span>
          </div>
          <div class="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full rounded-full" style="width:${width}%;background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
          </div>
        </div>`;
    });

  } else if (view === 'trend') {
    containerId = 'lossTrendChart';
    const daily = {};
    expenses.forEach(e => {
      if (e.date) daily[e.date] = (daily[e.date] || 0) + (parseFloat(e.amount) || 0);
    });
    const dates  = Object.keys(daily).sort().slice(-14);
    const maxVal = Math.max(...dates.map(d => daily[d]), 0.01);
    html = `
      <div class="text-xs text-gray-500 uppercase tracking-widest mb-3" style="font-family:'Space Mono',monospace">Daily Spending</div>
      <div class="flex items-end gap-1" style="height:96px">`;
    dates.forEach(date => {
      const val  = daily[date];
      const h    = Math.max(((val/maxVal)*100), 4);
      const d    = new Date(date + 'T12:00:00');
      const label = d.toLocaleDateString('en-US', { month:'numeric', day:'numeric' });
      html += `
        <div class="flex-1 flex flex-col items-center" title="$${val.toFixed(2)} on ${label}">
          <div class="w-full rounded-t" style="height:${h}%;background:${ROSE};opacity:0.85;min-height:3px"></div>
          <div class="text-xxxs text-gray-600 mt-1 rotate-0 leading-tight text-center" style="font-size:8px">${label}</div>
        </div>`;
    });
    html += '</div>';
    if (!dates.length) html = '<div class="text-center text-gray-500 py-8">No data for this period</div>';
  }

  const container = document.getElementById(containerId);
  if (container) { container.style.display = 'block'; container.innerHTML = html; }
}

function showEmptyChartState() {
  const el = document.getElementById('lossCategoryChart');
  if (el) {
    el.style.display = 'block';
    el.innerHTML = '<div class="text-center text-gray-500 py-8" style="font-family:\'Space Mono\',monospace;font-size:13px">No expenses for this period</div>';
  }
}

window.renderAllCharts = function() { renderOfflineCharts(); };

window.switchChartView = function(view) {
  window.currentChartView = view;
  document.querySelectorAll('.chart-tab').forEach(btn => {
    const active = btn.dataset.view === view;
    btn.style.background = active ? ROSE : '';
    btn.style.color      = active ? '#fff' : '';
    btn.classList.toggle('bg-rose-600',   active);
    btn.classList.toggle('text-white',    active);
    btn.classList.toggle('bg-gray-700',   !active);
    btn.classList.toggle('text-gray-300', !active);
  });
  renderOfflineCharts();
};

window.renderChartControls = function() {
  const v = window.currentChartView || 'category';
  const tab = (id, label) => {
    const a = v === id;
    return `<button onclick="switchChartView('${id}')" class="chart-tab flex-shrink-0 px-3 py-1.5 text-xs rounded ${a ? 'bg-rose-600 text-white' : 'bg-gray-700 text-gray-300'}" data-view="${id}" style="${a ? `background:${ROSE};color:#fff` : ''}">${label}</button>`;
  };
  return `<div class="flex gap-2 mb-4 overflow-x-auto pb-1">
    ${tab('category','By Category')}
    ${tab('merchant','By Merchant')}
    ${tab('trend','Daily Trend')}
  </div>`;
};
