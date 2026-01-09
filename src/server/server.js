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
    "livePrice",
    "signal",
    "accountDetails",
    "fvg",
    "timezone",
    "news",
    "events"
  ];

  if (singletonTypes.includes(incoming.type)) {
    // Remove previous entry of same type
    dataStore = dataStore.filter(d => d.type !== incoming.type);
  }

  dataStore.push(req.body);
  res.status(200).json({ ok: true });
});

app.post("/api/data/candles", (req, res) => {
  candles = [];
  candles.push(req.body);
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