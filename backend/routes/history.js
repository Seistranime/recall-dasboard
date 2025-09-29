const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  res.json([
    { time: "2025-09-20", pair: "ETH/USDC", side: "Buy", amount: 1.5, status: "Confirmed" },
    { time: "2025-09-22", pair: "BTC/USDC", side: "Sell", amount: 0.2, status: "Confirmed" }
  ]);
});

module.exports = router;
