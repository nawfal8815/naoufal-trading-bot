const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require('../../config/config');

const app = express();
const PORT = config.port || 3000;

// ✅ Absolute path to dist folder
const distPath = path.join(__dirname, "..", "..", "dist");

let dataStore = [];
let candles = [];

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve frontend static files
app.use(express.static(distPath));

// API routes
app.post("/api/data", (req, res) => {
  const incoming = req.body;

  // Types that should only exist once
  const singletonTypes = [
    "timezone",
    "fvgStatus"
  ];

  if (singletonTypes.includes(incoming.type)) {
    // Remove previous entry of same type
    dataStore = dataStore.filter(d => d.type !== incoming.type);
  }

  dataStore.push(req.body);
  res.status(200).json({ ok: true });
});

app.post("/api/data/candles", (req, res) => {
  const incoming = req.body?.candles;

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ error: "candles must be a non-empty array" });
  }

  const serverHasCandles = candles.length > 0;
  const incomingIsSingle = incoming.length === 1;
  const incomingIsMultiple = incoming.length > 1;

  // ❌ Server empty + single candle → ignore
  if (!serverHasCandles && incomingIsSingle) {
    return res.status(200).json({
      ok: true,
      ignored: true,
      reason: "No existing candles"
    });
  }

  // 🔄 Incoming multiple candles → reset & replace
  if (incomingIsMultiple) {
    candles = [...incoming];
    return res.status(200).json({
      ok: true,
      replaced: true,
      count: candles.length
    });
  }

  // ➕ Server has candles + single candle → append
  if (serverHasCandles && incomingIsSingle) {
    const candle = incoming[0];

    // Optional dedupe by datetime
    if (!candles.some(c => c.datetime === candle.datetime)) {
      candles.push(candle);
    }

    return res.status(200).json({
      ok: true,
      appended: true,
      count: candles.length
    });
  }

  res.status(200).json({ ok: true });
});

app.get("/api/data", (req, res) => {
  res.json(dataStore);
});

app.get("/api/data/candles", (req, res) => {
  res.json(candles);
});

// ✅ SPA fallback for Express 5 + path-to-regexp 8
// This must go **after** API routes
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on port ${PORT}`);
});