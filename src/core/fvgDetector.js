const config = require("../../config/config");
const { get15mSeriesArray } = require("../api/dataFeed");
const { postData } = require('../server/apiClient.js');
const { getNextAsiaSessionDate } = require('../utils/date');

function isBeforePreviousAsiaSession(candleDatetime) {
    const candleTime = new Date(candleDatetime.replace(" ", "T"));

    // Get the next Asia session first
    const nextAsiaSession = new Date(getNextAsiaSessionDate());

    // Subtract 1 day to get the previous session
    const previousAsiaSession = new Date(nextAsiaSession);
    previousAsiaSession.setDate(previousAsiaSession.getDate() - 1);

    return candleTime < previousAsiaSession;
}



function isFullyCompleted(candleTime) {
    const candleDate = new Date(candleTime);
    const now = new Date();

    // Calculate time difference in milliseconds
    const timeDiffMs = now - candleDate;
    const fifteenMinutesMs = 15 * 60 * 1000; // 15 minutes in milliseconds

    // Check if 15 minutes have passed
    return timeDiffMs >= fifteenMinutesMs;
}

function toUtcTimestamp(datetime) {
    // Converts "YYYY-MM-DD HH:mm:ss" → UTC timestamp
    return Date.parse(datetime.replace(" ", "T") + "Z");
}

function sameUtcDay(ts1, ts2) {
    const d1 = new Date(ts1);
    const d2 = new Date(ts2);
    return (
        d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate()
    );
}




function findFVGs(candles) {
    const fvgList = [];

    for (let i = 2; i < candles.length; i++) {
        const c1 = candles[i - 2]; // newest
        const c2 = candles[i - 1]; // middle (creation candle)
        const c3 = candles[i];     // oldest

        // Bullish FVG
        if (c1.low > c3.high && isBeforePreviousAsiaSession(c2.datetime) && isFullyCompleted(c3.datetime)) {
            const gapSize = c1.low - c3.high;

            // ❌ reject fake gaps
            if (gapSize < 0.00005) continue; // ~0.5 pip

            const FVGmid = c1.low - (gapSize / 2);
            fvgList.push({
                type: "bullish",
                createdAt: c1.datetime,
                createdIndex: i - 1,
                gapLow: c3.high,
                gapHigh: c1.low,
                gapMid: FVGmid
            });
        }

        // Bearish FVG
        if (c1.high < c3.low && isBeforePreviousAsiaSession(c2.datetime) && isFullyCompleted(c3.datetime)) {
            const gapSize = c3.low - c1.high;

            // ❌ reject fake gaps
            if (gapSize < 0.00005) continue; // ~0.5 pip

            const FVGmid = c3.low - (gapSize / 2);
            fvgList.push({
                type: "bearish",
                createdAt: c1.datetime,
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
    const nowTs = Date.now();

    for (const c of candles) {
        // only candles AFTER creation
        const candleTs = toUtcTimestamp(c.datetime);
        const fvgTs = toUtcTimestamp(fvg.createdAt);

        if (candleTs <= fvgTs) continue;
        if (!sameUtcDay(candleTs, fvgTs)) continue;
        if (candleTs < getNextAsiaSessionDate()) continue;



        // ---- BULLISH FVG ----
        if (signal.potential === "buy") {
            // invalid if price crosses midpoint
            if (c.low < fvg.gapMid) {
                return null;
            }



            if (
                signal.targetValid &&
                sameUtcDay(candleTs, nowTs) &&
                signal.target < c.high
            ) {
                signal.targetValid = false;
            }


            // touched but still valid (50%)
            if (c.low < fvg.gapHigh && c.low >= fvg.gapMid) {
                touched = true;
                console.log("touched bullish FVG at", fvg.createdAt);
            }
        }

        // ---- BEARISH FVG ----
        if (signal.potential === "sell") {
            // invalid if price crosses midpoint
            if (c.high > fvg.gapMid) {
                return null;
            }

            if (
                signal.targetValid &&
                sameUtcDay(candleTs, nowTs) &&
                signal.target > c.low
            ) {
                signal.targetValid = false;
            }


            // touched but still valid (50%)
            if (c.high > fvg.gapLow && c.high <= fvg.gapMid) {
                touched = true;
                console.log("touched bearish FVG at", fvg.createdAt);
            }
        }
    }

    return {
        ...fvg,
        fullVirgin: !touched
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

