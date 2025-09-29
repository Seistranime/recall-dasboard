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

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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
