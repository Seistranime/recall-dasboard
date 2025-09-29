const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { fromChain, toChain, fromToken, toToken, amount, side, reason } = req.body;
  res.json({ status: "success", trade: { fromChain, toChain, fromToken, toToken, amount, side, reason } });
});

module.exports = router;
