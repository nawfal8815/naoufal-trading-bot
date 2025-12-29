const config = require("../../config/config");
const { get15mSeriesArray } = require("../api/dataFeed");
const { postData } = require('../server/apiClient.js');

function isBefore2AM(datetime) {
    // 1️⃣ Get today's date in Vilnius
    const now = new Date();
    const todayVilnius = now.toLocaleDateString("sv-SE", {
        timeZone: config.timezone
    });

    // 2️⃣ Build today's 02:00 timestamp in Vilnius
    const cutoff = new Date(`${todayVilnius}T02:00:00`);

    // 3️⃣ Convert candle datetime safely to Date
    const candleTime = new Date(datetime.replace(" ", "T"));

    return candleTime < cutoff;
}

function isFullyCompleted (candleTime) {
    const candleDate = new Date(candleTime);
    const now = new Date();
    
    // Calculate time difference in milliseconds
    const timeDiffMs = now - candleDate;
    const fifteenMinutesMs = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    // Check if 15 minutes have passed
    return timeDiffMs >= fifteenMinutesMs;
}



function findFVGs(candles) {
    const fvgList = [];

    for (let i = 2; i < candles.length; i++) {
        const c1 = candles[i - 2]; // newest
        const c2 = candles[i - 1]; // middle (creation candle)
        const c3 = candles[i];     // oldest

        // Bullish FVG
        if (c1.low > c3.high && isBefore2AM(c2.datetime) && isFullyCompleted(c3.datetime)) {
            const gapSize = c1.low - c3.high;

            // ❌ reject fake gaps
            if (gapSize < 0.00005) continue; // ~0.5 pip

            const FVGmid = c1.low - ((c1.low - c3.high) / 2);
            fvgList.push({
                type: "bullish",
                createdAt: c2.datetime,
                createdIndex: i - 1,
                gapLow: c3.high,
                gapHigh: c1.low,
                gapMid: FVGmid
            });
        }

        // Bearish FVG
        if (c1.high < c3.low && isBefore2AM(c2.datetime) && isFullyCompleted(c3.datetime)) {
            const gapSize = c3.low - c1.high;

            // ❌ reject fake gaps
            if (gapSize < 0.00005) continue; // ~0.5 pip

            const FVGmid = c3.low - ((c3.low - c1.high) / 2);
            fvgList.push({
                type: "bearish",
                createdAt: c2.datetime,
                createdIndex: i - 1,
                gapLow: c1.high,
                gapHigh: c3.low,
                gapMid: FVGmid
            });
        }
    }

    return fvgList;
}


function isVirginFVG(fvg, candles, signal) {
    let touched = false;

    for (const c of candles) {
        // only candles AFTER creation
        if (new Date(c.datetime) <= new Date(fvg.createdAt)) continue;

        // ---- BULLISH FVG ----
        if (signal.potential === "buy") {
            // invalid if price crosses midpoint
            if (c.low < fvg.gapMid) {
                return null;
            }

            if (signal.targetValid){
                if (signal.target < c.high) signal.targetValid = false;
            }

            // touched but still valid (50%)
            if (c.low <= fvg.gapHigh && c.low >= fvg.gapMid) {
                touched = true;
            }
        }

        // ---- BEARISH FVG ----
        if (signal.potential === "sell") {
            // invalid if price crosses midpoint
            if (c.high > fvg.gapMid) {
                return null;
            }

            if (signal.targetValid){
                if (signal.target > c.low) signal.targetValid = false;
            }

            // touched but still valid (50%)
            if (c.high >= fvg.gapLow && c.high <= fvg.gapMid) {
                touched = true;
            }
        }
    }

    // ---- RESULT ----
    if (!touched) {
        return {
            ...fvg,
            fullVirgin: true
        };
    }

    // 50% virgin → shrink to midpoint
    return {
        ...fvg,
        fullVirgin: false
    };
}



async function findClosestVirginFVG(signal) {
    const candles = await get15mSeriesArray();
    await postData({
        type: "candles",
        timestamp: new Date().toISOString(),
        candles: candles
    });
    const fvgs = findFVGs(candles);
    const virgin = fvgs.map(f => isVirginFVG(f, candles, signal)).filter(Boolean);
    if (virgin.length === 0) return null;
    
    // newest first (index 0 = newest candle)
    if (signal.potential === "buy") return virgin.find(f => f.type === "bullish") || null;
    if (signal.potential === "sell") return virgin.find(f => f.type === "bearish") || null;
    return null;
}

module.exports = { findClosestVirginFVG };

