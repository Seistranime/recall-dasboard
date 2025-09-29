// server.js - Recall extended dashboard (simulated)
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
require('dotenv').config();
let envPort = (process.env.PORT && Number(process.env.PORT)) ? Number(process.env.PORT) : undefined;
// avoid clashing with common React/other dev servers on 3000
if (!envPort || envPort === 3000) envPort = 4000;
const PORT = envPort;
const DATA_FILE = process.env.DATA_FILE || './data/trades.json';

// Recall API configuration (optional)
const RECALL_API_URL = process.env.RECALL_API_URL || '';
const RECALL_API_KEY = process.env.RECALL_API_KEY || '';
const RECALL_TRADE_PATH = process.env.RECALL_TRADE_PATH || '/api/trade/execute';
const RECALL_PORTFOLIO_PATH = process.env.RECALL_PORTFOLIO_PATH || '/api/account/balances';
const RECALL_QUOTE_PATH = process.env.RECALL_QUOTE_PATH || '/api/trade/quote';
const RECALL_PRICE_PATH = process.env.RECALL_PRICE_PATH || '/api/price';

const app = express();
app.use(cors());
app.use(bodyParser.json());
// ensure data dir/file
async function ensureData() {
  const dir = path.dirname(DATA_FILE);
  await fs.ensureDir(dir);
  if (!await fs.pathExists(DATA_FILE)) {
    await fs.writeJson(DATA_FILE, { trades: [], portfolio: {} }, { spaces: 2 });
  }
}
ensureData().catch(console.error);

// util: read/write
async function readData() {
  // return file contents but ensure structure defaults so callers can safely push/modify
  try {
    const obj = await fs.readJson(DATA_FILE);
    return Object.assign({ trades: [], portfolio: {} }, obj || {});
  } catch (err) {
    // if file missing or corrupt, return defaults
    return { trades: [], portfolio: {} };
  }
}
async function writeData(obj) {
  return fs.writeJson(DATA_FILE, obj, { spaces: 2 });
}

// helper to call Recall API (if configured)
async function callRecall(path, opts = {}) {
  if (!RECALL_API_URL) throw new Error('RECALL_API_URL not configured');
  const url = new URL(path, RECALL_API_URL).toString();
  const headers = Object.assign({}, opts.headers || {});
  if (RECALL_API_KEY) headers.Authorization = `Bearer ${RECALL_API_KEY}`;
  const fetchOpts = Object.assign({}, opts, { headers });
  // node fetch compatibility: ensure global fetch exists (node 18+)
  try {
    const res = await fetch(url, fetchOpts);
    let data;
    try { data = await res.json(); } catch (e) { data = null; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    // Attempt an HTTPS fallback using native https to gather more diagnostics
    try {
      const https = require('https');
      const u = new URL(url);
      const opts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + (u.search || ''),
        method: opts && opts.method ? opts.method : 'GET',
        headers: Object.assign({}, fetchOpts.headers || {}, { 'content-type': (fetchOpts.headers && fetchOpts.headers['content-type']) || 'application/json' }),
        timeout: 10000
      };
      const body = fetchOpts.body || null;
      const fallbackRes = await new Promise((resolve, reject) => {
        const req = https.request(opts, (r) => {
          let chunks = [];
          r.on('data', (c) => chunks.push(c));
          r.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            let json = null;
            try { json = JSON.parse(text); } catch (e) { json = text; }
            resolve({ ok: r.statusCode >= 200 && r.statusCode < 300, status: r.statusCode, data: json });
          });
        });
        req.on('error', (e) => reject(e));
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
        if (body) req.write(body);
        req.end();
      });
      return fallbackRes;
    } catch (err2) {
      // don't include Authorization or sensitive headers in logs/returns
      return { ok: false, status: 'fetch_error', errorMessage: (err2 && err2.message) || String(err2), url };
    }
  }
}

// token mapping helper (loadable from data/token-mapping.json)
async function readTokenMapping() {
  const f = path.join(__dirname, 'data', 'token-mapping.json');
  try {
    return await fs.readJson(f);
  } catch (e) {
    return {};
  }
}

app.get('/api/token-mapping', async (req, res) => {
  const m = await readTokenMapping();
  res.json({ mapping: m });
});

// POST /api/trade  -> create simulated trade
// payload: { fromChain, fromSpecific, toChain, toSpecific, action, fromToken, toToken, amount, reason }
app.post('/api/trade', async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.fromChain || !body.toChain || !body.amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = await readData();
    const now = new Date().toISOString();
    const trade = {
      id: 't_' + Date.now(),
      timestamp: now,
      fromChain: body.fromChain,
      fromSpecific: body.fromSpecific,
      toChain: body.toChain,
      toSpecific: body.toSpecific,
      action: body.action, // buy | sell
      fromToken: body.fromToken,
      toToken: body.toToken,
      amount: Number(body.amount),
      reason: body.reason || '',
      fee: Number((Math.abs(body.amount) * 0.001).toFixed(6)), // simulated fee 0.1%
      status: 'filled'
    };

    // append
  // ensure trades is an array
  if (!Array.isArray(data.trades)) data.trades = [];
  data.trades.push(trade);

    // update simple portfolio: store as balances per token (USD not used)
  const p = (data.portfolio && typeof data.portfolio === 'object') ? data.portfolio : {};
    // adjust fromToken (subtract) and toToken (add)
    // For simplicity: if action == buy => spent fromToken, received toToken equal amount
    // We'll treat amount as "amount of toToken" for buys, and "amount of fromToken" for sells
    if (trade.action === 'buy') {
      // subtract approximate fromToken balance (we don't track price) => represent as negative flow
      p[trade.fromToken] = (p[trade.fromToken] || 0) - (trade.amount + trade.fee);
      p[trade.toToken] = (p[trade.toToken] || 0) + trade.amount;
    } else {
      // sell
      p[trade.fromToken] = (p[trade.fromToken] || 0) - (trade.amount + trade.fee);
      p[trade.toToken] = (p[trade.toToken] || 0) + trade.amount;
    }
    data.portfolio = p;

    await writeData(data);
    return res.json({ ok: true, trade });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/trades
app.get('/api/trades', async (req, res) => {
  try {
    const data = await readData();
    res.json({ trades: data.trades || [] });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/portfolio
app.get('/api/portfolio', async (req, res) => {
  try {
    const data = await readData();
    res.json({ portfolio: data.portfolio || {} });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/bridge -> simulated bridge request
// payload: { fromChain, fromSpecific, toChain, toSpecific, token, amount, reason }
app.post('/api/bridge', async (req, res) => {
  try {
    const b = req.body;
    if (!b || !b.token || !b.amount) return res.status(400).json({ error: 'missing' });

    const data = await readData();
    const tx = {
      id: 'bridge_' + Date.now(),
      timestamp: new Date().toISOString(),
      fromChain: b.fromChain,
      fromSpecific: b.fromSpecific,
      toChain: b.toChain,
      toSpecific: b.toSpecific,
      token: b.token,
      amount: Number(b.amount),
      status: 'relayed (simulated)'
    };
  if (!Array.isArray(data.trades)) data.trades = [];
  data.trades.push({ type: 'bridge', ...tx });
    await writeData(data);
    res.json({ ok: true, tx });
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/recall/balance -> fetch balances from Recall (if configured)
app.get('/api/recall/balance', async (req, res) => {
  try {
    if (!RECALL_API_URL) {
      // fallback to local portfolio
      const data = await readData();
      return res.json({ ok: true, balances: data.portfolio || {} });
    }
    const result = await callRecall(RECALL_PORTFOLIO_PATH, { method: 'GET' });
    if (result.ok) return res.json({ ok: true, balances: result.data });
    return res.status(502).json({ error: 'recall_error', details: result.data || result.status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /api/recall/trade -> proxy trade execution to Recall API and record result
app.post('/api/recall/trade', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.fromChain || !payload.toChain || !payload.amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // map incoming dashboard payload to Recall expected payload shape
    async function mapToRecallPayload(p) {
      const mapping = await readTokenMapping();
      const resolveToken = (t) => {
        if (!t) return t;
        // if mapping exists for ticker, use that, otherwise use provided token
        return mapping[t] || t;
      };
      // basic mapping - include both snake_case and camelCase variants so we match
      // different Recall endpoint expectations (some use fromToken/toToken)
      const resolvedFrom = resolveToken(p.fromToken);
      const resolvedTo = resolveToken(p.toToken);
      const amt = Number(p.amount);
      return {
        // Which chain/network - pass through
        chain: p.fromChain || p.chain || 'evm',
        fromChain: p.fromChain || p.chain || 'evm',
        toChain: p.toChain || p.chain || 'evm',
        // token identifiers: resolved via token-mapping.json
        from_token: resolvedFrom,
        to_token: resolvedTo,
        // camelCase variants
        fromToken: resolvedFrom,
        toToken: resolvedTo,
        // amount expressed as numeric
        amount: amt,
        // side: buy/sell (alias)
        side: p.action || 'buy',
        // optional fields (both variants)
        from_specific: p.fromSpecific,
        to_specific: p.toSpecific,
        fromSpecific: p.fromSpecific,
        toSpecific: p.toSpecific,
        reason: p.reason || '',
        // user agent / metadata
        meta: { source: 'recall-dashboard' }
      };
    }

    const mapped = await mapToRecallPayload(payload);

    // support dry-run for debugging (return mapped payload without contacting Recall)
    const isDry = req.query && (req.query.dry === 'true' || req.query.dry === '1');
    if (isDry) {
      console.log('DRY RUN mapped payload:', JSON.stringify(mapped));
      return res.json({ ok: true, dry: true, mapped });
    }

    if (!RECALL_API_URL) {
      // no recall configured - fallback to simulated behavior (reuse /api/trade behavior)
      const data = await readData();
      const now = new Date().toISOString();
      const trade = {
        id: 't_' + Date.now(),
        timestamp: now,
        fromChain: payload.fromChain,
        fromSpecific: payload.fromSpecific,
        toChain: payload.toChain,
        toSpecific: payload.toSpecific,
        action: payload.action,
        fromToken: payload.fromToken,
        toToken: payload.toToken,
        amount: Number(payload.amount),
        reason: payload.reason || '',
        fee: Number((Math.abs(payload.amount) * 0.001).toFixed(6)),
        status: 'simulated'
      };
      if (!Array.isArray(data.trades)) data.trades = [];
      data.trades.push(trade);
      data.portfolio = data.portfolio || {};
      await writeData(data);
      return res.json({ ok: true, simulated: true, trade });
    }

    // optionally get a quote first to supply price / routing info expected by Recall
    let quote = null;
    if (RECALL_QUOTE_PATH) {
      try {
        const qp = await callRecall(RECALL_QUOTE_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(mapped)
        });
        if (qp.ok && qp.data) quote = qp.data;
      } catch (e) {
        // ignore quote failure and continue to attempt execute (server may still accept)
        console.warn('quote request failed', e && e.message);
      }
    }

    // call Recall API to execute the trade (include quote if available)
  const executeBody = quote ? Object.assign({}, mapped, { quote }) : mapped;
    // debug: log execute body keys (not API key) to help troubleshoot missing param issues
    try {
      const safeLog = Object.keys(executeBody).reduce((acc, k) => { acc[k] = typeof executeBody[k] === 'string' || typeof executeBody[k] === 'number' ? executeBody[k] : '[complex]'; return acc; }, {});
      console.log('Calling recall execute with:', JSON.stringify(safeLog));
      // also persist a copy to data/last_execute_log.json for debugging
      try {
        const p = require('path').resolve(__dirname, 'data', 'last_execute_log.json');
        require('fs').writeFileSync(p, JSON.stringify({ts: new Date().toISOString(), body: safeLog}, null, 2));
      } catch (e) {
        // ignore file write errors
      }
    } catch (e) { /* ignore logging errors */ }
    const recallRes = await callRecall(RECALL_TRADE_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(executeBody)
    });

    if (!recallRes.ok) {
      const details = recallRes.status === 'fetch_error' ? { errorMessage: recallRes.errorMessage, url: recallRes.url } : (recallRes.data || recallRes.status);
      console.warn('Recall execute failed, falling back to simulated trade:', details);
      // fallback: record a simulated local trade so UI/history remains functional
      try {
        const data = await readData();
        const now = new Date().toISOString();
        const trade = {
          id: 'sim_fallback_' + Date.now(),
          timestamp: now,
          fromChain: payload.fromChain,
          fromSpecific: payload.fromSpecific,
          toChain: payload.toChain,
          toSpecific: payload.toSpecific,
          action: payload.action,
          fromToken: payload.fromToken,
          toToken: payload.toToken,
          amount: Number(payload.amount),
          reason: payload.reason || '',
          fee: Number((Math.abs(payload.amount) * 0.001).toFixed(6)),
          status: 'simulated_fallback',
          recall_error: details
        };
        if (!Array.isArray(data.trades)) data.trades = [];
        data.trades.push(trade);
        data.portfolio = data.portfolio || {};
        // simple portfolio update similar to simulated branch
        if (trade.action === 'buy') {
          data.portfolio[trade.fromToken] = (data.portfolio[trade.fromToken] || 0) - (trade.amount + trade.fee);
          data.portfolio[trade.toToken] = (data.portfolio[trade.toToken] || 0) + trade.amount;
        } else {
          data.portfolio[trade.fromToken] = (data.portfolio[trade.fromToken] || 0) - (trade.amount + trade.fee);
          data.portfolio[trade.toToken] = (data.portfolio[trade.toToken] || 0) + trade.amount;
        }
        await writeData(data);
        return res.json({ ok: true, fallback: true, recall_error: details, trade });
      } catch (e) {
        console.error('Failed to write fallback trade', e);
        return res.status(502).json({ error: 'recall_error', details });
      }
    }

    // record a local copy so UI shows executed trades
    try {
      const data = await readData();
      const tx = recallRes.data || {};
      if (!Array.isArray(data.trades)) data.trades = [];
      data.trades.push(Object.assign({ id: tx.id || ('recall_' + Date.now()), timestamp: new Date().toISOString(), action: payload.action, fromToken: payload.fromToken, toToken: payload.toToken, amount: Number(payload.amount), status: tx.status || 'submitted' }, tx));
      await writeData(data);
    } catch (e) {
      console.warn('failed to write local trade copy', e);
    }

    return res.json({ ok: true, result: recallRes.data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/recall/price?chain=evm&token=USDC -> proxy to Recall price endpoint
app.get('/api/recall/price', async (req, res) => {
  try {
    const chain = req.query.chain || 'evm';
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'missing token query param' });
    if (!RECALL_API_URL) return res.status(400).json({ error: 'RECALL_API_URL not configured' });
    const path = `${RECALL_PRICE_PATH}?chain=${encodeURIComponent(chain)}&token=${encodeURIComponent(token)}`;
    const result = await callRecall(path, { method: 'GET' });
    if (result.ok) return res.json({ ok: true, price: result.data });
    return res.status(502).json({ error: 'recall_error', details: result.data || result.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal error' });
  }
});

// fallback - serve UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start server with simple retry if port already in use
function startServer(port, attemptsLeft = 5) {
  const server = app.listen(port, () => {
    console.log(`Recall extended dashboard running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} in use, trying ${port + 1}... (${attemptsLeft - 1} attempts left)`);
      setTimeout(() => startServer(port + 1, attemptsLeft - 1), 300);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);
