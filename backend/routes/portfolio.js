const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  res.json({
    totalUSD: 15000,
    breakdownChain: { EVM: 8200, SVM: 6800 },
    breakdownToken: { ETH: 4000, BTC: 4200, USDC: 1800 },
    pnl: { percent: 12.5, usd: 1200 },
    history: [10000, 11000, 12500, 15000]
  });
});

module.exports = router;
