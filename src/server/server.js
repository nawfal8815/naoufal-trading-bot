const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require('../../config/config');

const app = express();
const PORT = config.port || 3000;

let dataStore = [];
let candles = [];

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 👉 serve frontend
app.use(express.static(path.join(__dirname, "dist")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.post("/api/data", (req, res) => {
  dataStore.push(req.body);
  res.status(200).json({ ok: true });
});

app.post("/api/data/candles", (req, res) => {
  candles.push(req.body);
  res.status(200).json({ ok: true });
});

app.get("/api/data", (req, res) => {
  res.json(dataStore);
});

app.get("/api/data/candles", (req, res) => {
  res.json(candles);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend listening on port ${PORT}`);
});
