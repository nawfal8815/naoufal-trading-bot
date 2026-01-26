const { findClosestVirginFVG } = require("../core/fvgDetector");
const { getEntryData, confirmationTimeChecker } = require("../core/riskManager");
const signalBuilder = require("../core/signalBuilder");
const { monitorFVG } = require("../core/fvgMonitor");
const { sleepUntilNextAsiaSession, msUntilNextAsiaSession } = require("../utils/sleepUntilNextAsiaSession");
const config = require("../../config/config");
const { newsDecision } = require("../core/newsHandler");
const { getNews } = require('../api/news');
const { executeTradeOnAllAccounts, accountsApproval, updateBalance } = require("../../firebase/accountsLogger");
const { monitorTrade } = require("../core/tradeMonitor");
const { sleep } = require("../utils/sleep");
const { postData } = require("../server/apiClient");
const { setTimeZone, checkIfWeekend } = require("../utils/date");
const { initCollections } = require('../../firebase/initCollections');
const { saveLog, saveDailyInfo, saveNews, savePosition } = require('../../firebase/queries');
const { updateCandlesData, updatePriceData } = require('../utils/candlesUpdater');
const { telegramUsersSender } = require('../services/telegram');
const chalk = require('chalk').default;

let strategyRunning = false; // prevent overlapping runs
let tradesToday = 0;

async function runStrategy() {

    // await saveLog(`[${processId}] Starting strategy...`);


    //running main strategy logic
    try {
        //init collections
        await initCollections();

        //generate a process id
        const processId = Math.random().toString(36).substring(2, 9); // Unique ID for this process invocation

        if (strategyRunning) {
            console.log(`[${chalk.green(processId)}]: Strategy already running, preventing overlap.`);
            return;
        }
        strategyRunning = true;
        console.log(`[${chalk.green(processId)}]: Starting strategy...`);


        //start balance getter every 10 mins
        updateBalance();

        // set Timezone
        config.timezone = await setTimeZone();
        if (config.timezone != "") {
            await postData({
                type: "timezone",
                timezone: config.timezone,
            });
        } else {
            console.log("❌ Error posting the timezone");
            await saveLog("❌ Error posting the timezone");
        }

        //check if its weekend
        if (await checkIfWeekend()) {
            tradesToday
            console.log("Weekend — no trading 🚫");
            await saveLog("Weekend — no trading 🚫");
            tradesToday = 0;
            const delay = await msUntilNextAsiaSession();
            return restartStrategy(delay, processId);
        }

        // update latest candle and live price
        updateCandlesData();
        updatePriceData();

        //set the timer to auto reexecute the strategie the next day
        const delay = await msUntilNextAsiaSession();
        setTimeout(() => {
            console.log("🌅 New Asia session... Restarting the strategy");
            saveLog("🌅 New Asia session... Restarting the strategy");
            tradesToday = 0;
            return restartStrategy(0, processId);
        }, delay);

        // Check news first
        const events = await getNews();
        const newsRules = await newsDecision(events);
        console.log(newsRules.decision);
        await saveLog(newsRules.decision);
        const newsDB = {
            decision: newsRules.decision,
            events: events
        }
        await saveNews(newsDB);
        if (newsRules.skipDay) {
            telegramUsersSender(
                `⚠️ *Trading Skipped Today*
                High impact news events detected for ${config.symbol}. No trades will be taken today.
            `, { parse_mode: "Markdown" });
            tradesToday = 0;
            console.log("Trading skipped for today due to high-impact news events.");
            await saveLog("Trading skipped for today due to high-impact news events.");
            await sleepUntilNextAsiaSession();
            return restartStrategy(0, processId); // restart fresh next day
        } else config.tradeQuality += 40;
        if (newsRules.blockTimes.length === 0) config.tradeQuality += 20;
        if (newsRules.warnTimes.length === 0) config.tradeQuality += 10;

        await sleep(2000); // brief pause before proceeding


        //get todays signal
        const signal = await signalBuilder();
        if (!signal || signal.potential === "none") {
            console.log("No valid signal, retrying in 30 secs...");
            saveLog("No valid signal, retrying in 30 secs...");
            return restartStrategy(30000, processId);
        }

        telegramUsersSender(
            `📈 *New Signal Detected! ${config.symbol}*
            Potential: ${signal.potential}
        `, { parse_mode: "Markdown" });

        console.log("Final Signal:", signal.potential);
        await saveLog("Final Signal: " + signal.potential);

        await sleep(2000); // brief pause before proceeding

        //find closest virgin FVG
        const fvg = await findClosestVirginFVG(signal);
        if (!fvg) {
            console.log("No virgin FVG found, restarting strategy the next day...");
            saveLog("No virgin FVG found, restarting strategy the next day...");
            return restartStrategy(0, processId);
        }

        if (fvg.fullVirgin) config.tradeQuality += 10;

        telegramUsersSender(
            `📊 *Closest Virgin FVG*
            Type: ${fvg.type}
            Created At: ${fvg.createdAt}
            Gap Low: ${fvg.gapLow}
           Gap High: ${fvg.gapHigh}
            Virgin: ${fvg.fullVirgin ? "Full" : "50%"}
            `,
            { parse_mode: "Markdown" }
        );

        console.log("Closest Virgin FVG for signal:", fvg);
        await saveLog(`📊 *Closest Virgin FVG*
            Type: ${fvg.type}
            Created At: ${fvg.createdAt}
            Gap Low: ${fvg.gapLow}
           Gap High: ${fvg.gapHigh}
            Virgin: ${fvg.fullVirgin ? "Full" : "50%"}
            `);

        await sleep(2000); // brief pause before proceeding

        //to add later: check if the market is ranged or trending before monitoring FVG
        // if (isMarketRanged()) config.tradeQuality += 10;
        // 10% quality of the trade if its not ranged
        //TO DO!!

        if (signal.targetValid) config.tradeQuality += 10;

        const dailyInfoDB = {
            bias: signal.potential,
            quality: config.tradeQuality,
            target: signal.target,
            fvg: {
                createdAt: fvg.createdAt,
                type: fvg.type,
                gapHigh: fvg.gapHigh,
                gapLow: fvg.gapLow,
                gapMid: fvg.gapMid,
                fullVirgin: fvg.fullVirgin ? "Full" : "50%",
                createdIndex: fvg.createdIndex
            }
        }
        await saveDailyInfo(dailyInfoDB);

        //monitor FVG for confirmation
        const result = await monitorFVG({
            fvg,
            signal,
            processId
        });



        if (result.status === "confirmed") {
            if (!confirmationTimeChecker(newsRules)) {
                telegramUsersSender(
                    `⛔ *Trade Cancelled! ${config.symbol}*
                    Trade cancelled due to high-impact news events.
                    `, { parse_mode: "Markdown" });

                console.log("Trade cancelled due to news impact.");
                await saveLog("Trade cancelled due to news impact.");
                return restartStrategy(0, processId);
            } else {
                //place trade
                const entryData = await getEntryData(fvg, result.entryCandle, signal.potential);
                const displayedEntryData = {
                    entryPrice: entryData.entryPrice / config.risk.slMultipler,
                    tp: entryData.tp / config.risk.slMultipler,
                    sl: entryData.sl / config.risk.slMultipler
                }
                console.log("Placing trade with entry data: Entry price " + displayedEntryData.entryPrice + ", Stop lose " + displayedEntryData.sl + ", Take profit " + displayedEntryData.tp);
                await executeTradeOnAllAccounts(entryData);
                await saveLog("Placing trade with entry data: Entry price " + displayedEntryData.entryPrice + ", Stop lose " + displayedEntryData.sl + ", Take profit " + displayedEntryData.tp);
                console.log("Trade placed with succes.");
                await saveLog("Trade placed with succes.");
                telegramUsersSender(
                    `🚀 *Trade Confirmed! ${config.symbol}*
                    Bias: ${signal.potential}
                    Entry Price: ${displayedEntryData.entryPrice}
                    Stop Loss: ${displayedEntryData.sl}
                    Take Profit: ${displayedEntryData.tp}
                    `, { parse_mode: "Markdown" });

                tradesToday++;
                const positionDB = {
                    direction: signal.potential,
                    entryPrice: displayedEntryData.entryPrice,
                    stopLoss: displayedEntryData.sl,
                    takeProfit: displayedEntryData.tp,
                    epic: "CS.D.EURUSD.CFD.IP" // Hardcoded for now, can be passed later
                }
                await savePosition(positionDB);

                await monitorTrade(displayedEntryData.tp, displayedEntryData.sl, signal.potential, processId);
                if (tradesToday === config.risk.maxTreadesPerDay) {
                    tradesToday = 0;
                    console.log("Max trades amount for today has been reached, restarting...");
                    await saveLog("Max trades amount for today has been reached, restarting...");
                    await sleepUntilNextAsiaSession();
                } else {
                    console.log("Trade executed successfully. Restarting strategy.");
                    await saveLog("Trade executed successfully. Restarting strategy.");
                }
                return restartStrategy(0, processId);
            }
        } if (result.status === "expired") {
            console.log("FVG expired or invalidated. Restarting strategy...");
            saveLog("FVG expired or invalidated. Restarting strategy...");
            return restartStrategy(0, processId);
        }

    } catch (err) {
        console.error("Strategy error:", err);
        await saveLog("Strategy error: " + err);

        console.log("Retrying strategy in 30 seconds...");
        return restartStrategy(30000);
    }
}

async function restartStrategy(delay = 0, processId) {
    strategyRunning = false;
    if (delay > 0) {
        console.log(`[${chalk.blue.underline(processId)}]: Waiting for ${delay / 1000} seconds before restarting...`);
        await sleep(delay);
    }
    console.log(`[${chalk.blue.underline(processId)}]: Restarting strategy...`);
    return runStrategy();
}

module.exports = { runStrategy };
