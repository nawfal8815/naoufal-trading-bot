const config = require("../../config/config");
const { get15mSeriesArray } = require("../api/dataFeed");
const { postData } = require('../server/apiClient.js');
const { getNextAsiaSessionDate, getPreviousAsiaSessionDate } = require('../utils/date');

function isBeforePreviousAsiaSession(candleDatetime) {;
    return new Date(candleDatetime) < new Date(getPreviousAsiaSessionDate());
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
    const now = new Date();

    for (const c of candles) {
        // only candles AFTER creation
        const candleTime = new Date(c.datetime);
        const fvgTime = new Date(fvg.createdAt);

        if (candleTime <= fvgTime) continue;



        // ---- BULLISH FVG ----
        if (signal.potential === "buy") {
            // invalid if price crosses midpoint
            if (c.low < fvg.gapMid) {
                return null;
            }



            if (
                signal.targetValid &&
                candleTime.getDay() === fvgTime.getDay() &&
                signal.target < c.high
            ) {
                signal.targetValid = false;
            }


            // touched but still valid (50%)
            if (c.low < fvg.gapHigh && c.low >= fvg.gapMid) {
                touched = true;
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
                candleTime.getDay() === now.getDay() &&
                signal.target > c.low
            ) {
                signal.targetValid = false;
            }


            // touched but still valid (50%)
            if (c.high > fvg.gapLow && c.high <= fvg.gapMid) {
                touched = true;
                // console.log("touched bearish FVG at", fvg.createdAt);
            }
        }
    }

    return {
        ...fvg,
        fullVirgin: !touched
    };
}



async function findClosestVirginFVG(signal, twelveData) {
    const candles = await get15mSeriesArray(twelveData);
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

