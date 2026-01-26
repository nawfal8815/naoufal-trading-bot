// src/index.js
require("dotenv").config();

const { server } = require("./server/server");
const { runStrategy } = require("./strategies/mainStrategy");

(async () => {
  try {
    console.log("🧠 Starting strategy...");
    await runStrategy();
    console.log("✅ Strategy started");
  } catch (err) {
    console.error("❌ Strategy failed to start:", err);
    process.exit(1);
  }
})();
