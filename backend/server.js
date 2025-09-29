const express = require("express");
const cors = require("cors");
require("dotenv").config();

const tradeRoutes = require("./routes/trade");
const portfolioRoutes = require("./routes/portfolio");
const historyRoutes = require("./routes/history");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/trade", tradeRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/history", historyRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
