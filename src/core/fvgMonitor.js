const { isPriceInFVG } = require('./livePrice');
const { sleep } = require('../utils/sleep');
const { fetchLatestClosedCandle } = require('../api/dataFeed');
const { is15MinBoundary } = require('../utils/date');
const { isRanged } = require("../core/RangeDetector");

async function monitorFVG({ fvg, signal}) {
    if (!fvg) return { status: "expired" };
    let messageDisplayed = false;
    console.log("⏳ Waiting for price to enter FVG...");

    const startTime = Date.now();
    const maxWait = 1000 * 60 * 60 * 10; // max 10 hours of monitoring

    // ---- PHASE 1: wait for touch ----
    while (true) {
        const priceData = await isPriceInFVG(fvg, signal);
        if (priceData.inFVG) {
            console.log("🎯 Price entered FVG:", priceData.candle);
            // const rangeDetector = await isRanged(fvg, candles);
            // if (!rangeDetector) {
            //     console.log("Market is not ranged, skipping trade. High risk setup...");
            // } else console.log("Market is ranged");
            break;
        }

        if (Date.now() - startTime > maxWait) {
            console.log("⏱ FVG touch timeout");
            return { status: "expired" };
        }

        if (!signal.targetValid && !messageDisplayed) {
            console.log(`🏁 ${signal.potential} Target ${signal.target} was reached today before FVG was touched: ${priceData.price}, the trade will be risky`);
            messageDisplayed = true;
        }

        await sleep(2.5 * 60 * 1000); // 2.5 minute polling
    }

    console.log("📊 Monitoring candles inside FVG...");

    // ---- PHASE 2 + 3: candle logic ----
    while (true) {
        const now = new Date();

        if (!is15MinBoundary(now)) {
            await sleep(5000);
            continue;
        }

        const candle = await fetchLatestClosedCandle();
        if (!candle) {
            await sleep(5000);
            continue;
        }

        // ❌ FVG invalidation
        if (isFVGExpired(candle, fvg, signal.potential)) {
            console.log("❌ FVG expired by candle close:", candle.close);
            return { status: "expired" };
        }

        // ✅ Confirmation
        if (isConfirmationCandle(candle, signal.potential)) {
            console.log("✅ Confirmation candle detected!");
            return {
                status: "confirmed",
                entryCandle: candle,
                fvg
            };
        }

        await sleep(60 * 1000); // avoid tight loop every 1 minute
    }
}

function isFVGExpired(candle, fvg, bias) {
    if (!fvg) return true;
    return bias === "buy" ? candle.close < fvg.gapLow : candle.close > fvg.gapHigh;
}

function isConfirmationCandle(candle, bias) {
    const upMove = candle.high - candle.open;
    const downMove = candle.open - candle.low;

    return bias === "buy" ? upMove > downMove : downMove > upMove;
}

module.exports = { monitorFVG };
