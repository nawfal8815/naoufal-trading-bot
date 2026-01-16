const { isPriceInFVG } = require('./livePrice');
const { sleep } = require('../utils/sleep');
const { fetchLatestClosedCandle } = require('../api/dataFeed');
const { is15MinBoundary } = require('../utils/date');
const { postData } = require('../server/apiClient');
const { saveLivePrice } = require('../../firebase/queries');
const config = require('../../config/config');
const chalk = require('chalk').default;

async function monitorFVG({ fvg, signal, processId }) {
    if (!fvg) return { status: "expired" };
    console.log(`[${chalk.green(processId)}]: ⏳ Waiting for price to enter FVG...`);
    await postData({
        type: "fvgStatus",
        status: `⏳ Waiting for price to enter FVG...`
    }, {
        headers: {
            authorization: `x-bot-api-key ${config.botApiKey}` // Attach ID Token to headers
        }
    });
    const startTime = Date.now();
    const maxWait = 1000 * 60 * 60 * 10; // max 10 hours of monitoring

    if (!signal.targetValid) {
        console.log(`[${chalk.yellow.bold(processId)}]: 🏁 ${signal.potential} Target ${signal.target} was reached today before FVG was touched, the trade will be risky`);
        messageDisplayed = true;
    }
    if (signal.targetValid) {
        console.log(`[${chalk.green(processId)}]: 🎯 Target of today: ${signal.target}`);
    }

    // ---- PHASE 1: wait for touch ----
    while (true) {
        const priceData = await isPriceInFVG(fvg, signal);
        if (priceData.inFVG) {
            console.log(`[${chalk.green(processId)}]: 🎯 Price entered FVG: ${priceData.candle}`);
            await postData({
                type: "fvgStatus",
                status: `🎯 Price entered FVG: ${priceData.candle}`
            });
            break;
        }

        if (Date.now() - startTime > maxWait) {
            console.log(`[${chalk.red(processId)}]: ⏱ FVG touch timeout`);
            await postData({
                type: "fvgStatus",
                status: `⏱ FVG touch timeout`
            });
            return { status: "expired" };
        }


        await sleep(2.5 * 60 * 1000); // 2.5 minute polling
    }

    console.log(`[${chalk.green(processId)}]: 📊 Monitoring candles inside FVG...`);
    await postData({
        type: "fvgStatus",
        status: `📊 Monitoring candles inside FVG...`
    }, {
        headers: {
            authorization: `x-bot-api-key ${config.botApiKey}` // Attach ID Token to headers
        }
    });

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

        await saveLivePrice({
            price: candle.close
        });

        // ❌ FVG invalidation
        if (isFVGExpired(candle, fvg, signal.potential)) {
            console.log(`[${chalk.red(processId)}]: ❌ FVG expired by candle close: ${candle.close}`);
            await postData({
                type: "fvgStatus",
                status: `❌ FVG expired by candle close: ${candle.close}`
            }, {
                headers: {
                    authorization: `x-bot-api-key ${config.botApiKey}` // Attach ID Token to headers
                }
            });
            return { status: "expired" };
        }

        // ✅ Confirmation
        if (isConfirmationCandle(candle, signal.potential)) {
            console.log(`[${chalk.green(processId)}]: ✅ Confirmation candle detected!`);
            await postData({
                type: "fvgStatus",
                status: `✅ Confirmation candle detected!`
            }, {
                headers: {
                    authorization: `x-bot-api-key ${config.botApiKey}` // Attach ID Token to headers
                }
            });
            return {
                status: "confirmed",
                entryCandle: candle
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
