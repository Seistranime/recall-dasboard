// simple frontend to call our API
const apiBase = '';

async function api(path, opts = {}) {
  const res = await fetch(apiBase + path, opts);
  return res.json();
}

function formatDate(t) {
  try { return new Date(t).toLocaleString(); } catch(e){ return t; }
}

async function refreshAll() {
  document.getElementById('portfolioSummary').innerText = 'Memuat...';
  const [tradesRes, portRes] = await Promise.all([api('/api/trades'), api('/api/portfolio')]);
  const trades = tradesRes.trades || [];
  const portfolio = portRes.portfolio || {};

  // portfolio summary
  const keys = Object.keys(portfolio);
  if (keys.length === 0) {
    document.getElementById('portfolioSummary').innerText = 'Portfolio kosong';
  } else {
    const parts = keys.map(k => `${k}: ${Number(portfolio[k]).toFixed(6)}`);
    document.getElementById('portfolioSummary').innerText = parts.join(' | ');
  }

  // trades table
  const tbody = document.querySelector('#tradesTable tbody');
  tbody.innerHTML = '';
  trades.slice().reverse().forEach(t => {
    // support both trade and bridge entries
    const tr = document.createElement('tr');
    const time = formatDate(t.timestamp || t.date || '');
    const action = t.action || t.type || 'bridge';
    const from = t.fromToken ? `${t.fromToken} (${t.fromSpecific || t.fromChain || ''})` : (t.fromSpecific || '');
    const to = t.toToken ? `${t.toToken} (${t.toSpecific || t.toChain || ''})` : (t.toSpecific || '');
    const amount = t.amount !== undefined ? Number(t.amount).toFixed(6) : '';
    const fee = t.fee !== undefined ? Number(t.fee).toFixed(6) : '';
    const reason = t.reason || '';
    tr.innerHTML = `<td>${time}</td><td>${action}</td><td>${from}</td><td>${to}</td><td>${amount}</td><td>${fee}</td><td>${reason}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('tradeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    fromChain: document.getElementById('fromChain').value,
    fromSpecific: document.getElementById('fromSpecific').value,
    toChain: document.getElementById('toChain').value,
    toSpecific: document.getElementById('toSpecific').value,
    action: document.getElementById('action').value,
    fromToken: document.getElementById('fromToken').value.trim(),
    toToken: document.getElementById('toToken').value.trim(),
    amount: document.getElementById('amount').value,
    reason: document.getElementById('reason').value.trim()
  };
  const res = await api('/api/trade', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(payload) });
  if (res.ok) {
    alert('Trade tercatat (simulated).');
    document.getElementById('tradeForm').reset();
    refreshAll();
  } else {
    alert('Error: ' + (res.error || JSON.stringify(res)));
  }
});

document.getElementById('bridgeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    fromChain: 'evm',
    fromSpecific: document.getElementById('bFromSpecific').value,
    toChain: 'evm',
    toSpecific: document.getElementById('bToSpecific').value,
    token: document.getElementById('bToken').value,
    amount: document.getElementById('bAmount').value
  };
  const res = await api('/api/bridge', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(payload) });
  if (res.ok) {
    alert('Bridge request sent (simulated).');
    refreshAll();
  } else {
    alert('Bridge error: ' + (res.error || JSON.stringify(res)));
  }
});

document.getElementById('refreshBtn').addEventListener('click', refreshAll);
document.getElementById('exportBtn').addEventListener('click', async () => {
  const res = await api('/api/trades');
  const trades = res.trades || [];
  let csv = 'id,timestamp,action,fromToken,toToken,amount,fee,reason\\n';
  trades.forEach(t => {
    csv += `${t.id || ''},"${t.timestamp || ''}",${t.action || t.type || ''},${t.fromToken || ''},${t.toToken || ''},${t.amount || ''},${t.fee || ''},"${(t.reason || '').replace(/"/g,'""')}"\\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'trades.csv'; document.body.appendChild(a); a.click(); a.remove();
});

refreshAll();
