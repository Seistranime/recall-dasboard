// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs-extra");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "portfolio.json");

fs.ensureFileSync(DATA_FILE);
if (!fs.readFileSync(DATA_FILE, "utf-8")) {
  fs.writeFileSync(DATA_FILE, "[]");
}

app.post("/api/trade", async (req, res) => {
  try {
    const { fromChain, fromSpecific, toChain, toSpecific, action, fromToken, toToken, amount, reason } = req.body;
    const portfolio = JSON.parse(fs.readFileSync(DATA_FILE));
    const trade = { fromChain, fromSpecific, toChain, toSpecific, action, fromToken, toToken, amount, reason, timestamp: new Date().toISOString() };
    portfolio.push(trade);
    fs.writeFileSync(DATA_FILE, JSON.stringify(portfolio, null, 2));
    res.json({ success: true, trade });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/portfolio", (req, res) => {
  try {
    const portfolio = JSON.parse(fs.readFileSync(DATA_FILE));
    res.json({ success: true, portfolio });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Recall Trading Dashboard running on http://localhost:${PORT}`));
