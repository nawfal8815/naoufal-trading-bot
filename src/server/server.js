require('dotenv').config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require('../../config/config');

const { login, getAccount } = require("../services/igMarkets");
const { igMarketsChecked, igMarketsundefiened, saveUserBalance } = require("../../firebase/queries");
const { admin } = require('../../firebase/firebaseAdmin');

const app = express();
const PORT = config.port || 3000;

// ✅ Absolute path to dist folder
const distPath = path.join(__dirname, "..", "..", "dist");

let dataStore = [];
let candles = [];

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Bot Authentication Middleware
const botAuthMiddleware = (req, res, next) => {
    const botApiKey = req.headers.authorization?.split('x-bot-api-key ')[1];
    if (!botApiKey || botApiKey !== process.env.BOT_API_KEY) {
        return res.status(401).json({ error: "Unauthorized: Invalid Bot API Key" });
    }
    next();
};

// Firebase Authentication Middleware
const firebaseAuthMiddleware = async (req, res, next) => {
    // Routes that don't require Firebase authentication (bot routes already handled by botAuthMiddleware)
    // If a request already passed botAuthMiddleware, we assume it's a bot.
    // For simplicity here, we'll check the header again. A more robust solution might
    // have botAuthMiddleware set req.isBot = true.
    if (req.headers.authorization?.split('x-bot-api-key ')[1]) {
        return next(); // Already handled by botAuthMiddleware, or is a bot
    }

    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Error verifying Firebase ID token:", error);
        return res.status(401).json({ error: "Unauthorized: Invalid token." });
    }
};

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

app.post("/api/data/candles", botAuthMiddleware, (req, res) => {
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

app.post("/api/verify-ig-account", firebaseAuthMiddleware, async (req, res) => {
    const { uid, igAccount } = req.body;

    if (!uid || !igAccount) {
        return res.status(400).json({ success: false, message: "Missing userId or igAccount data." });
    }

    try {
        const authHeaders = await login(igAccount.apiKey, igAccount.username, igAccount.password);
        const account = await getAccount(igAccount.accountID, authHeaders);
        
        // If successful, update Firestore
        await igMarketsChecked(uid);
        await saveUserBalance(uid, account.balance.balance);

        return res.status(200).json({ success: true, message: "IG account verified successfully." });
    } catch (error) {
        console.error("IG account verification failed");
        // If verification fails, update Firestore as undefined
        await igMarketsundefiened(uid);
        return res.status(500).json({ success: false, message: "IG account verification failed.", error: error.message });
    }
});

app.get("/api/data", firebaseAuthMiddleware, (req, res) => {
  res.json(dataStore);
});

app.get("/api/data/candles", firebaseAuthMiddleware, (req, res) => {
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