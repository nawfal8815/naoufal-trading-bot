// src/index.js
require("dotenv").config();

const { server } = require("./server/server");
const { runStrategy } = require("./strategies/mainStrategy");
const { updateCandlesData, updatePriceData } = require('./utils/candlesUpdater');


(async () => {
  try {
    // update latest candle and live price
    updateCandlesData();
    updatePriceData();
    await runStrategy();
  } catch (err) {
    console.error("❌ Strategy failed to start:", err);
    process.exit(1);
  }
})();
