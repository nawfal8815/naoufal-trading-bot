const { findClosestVirginFVG } = require("../core/fvgDetector");
const { getEntryData, confirmationTimeChecker } = require("../core/riskManager");
const signalBuilder = require("../core/signalBuilder");
const { monitorFVG } = require("../core/fvgMonitor");
const { sleepUntilNextAsiaSession, msUntilNextAsiaSession } = require("../utils/sleepUntilNextAsiaSession");
const config = require("../../config/config");
const { newsDecision } = require("../core/newsHandler");
const { getNews } = require('../api/news');
const { executeTradeOnAllAccounts } = require("../../firebase/accountsLogger");
const { monitorTrade } = require("../core/tradeMonitor");
const { sleep } = require("../utils/sleep");
const { postData } = require("../server/apiClient");
const { setTimeZone, checkIfWeekend } = require("../utils/date");
const { initCollections } = require('../../firebase/initCollections');
const { saveLog, saveDailyInfo, saveNews, savePosition } = require('../../firebase/queries');
const twelveData = require("../services/twelveDataClient");
const chalk = require('chalk').default;

let strategyRunning = false; // prevent overlapping runs
let tradesToday = 0;
const RESTART_DELAY = 30 * 60 * 1000; // 30 minutes for now
const RESTART_UNIT = "minutes";
let processId;

async function runStrategy() {
    //running main strategy logic
    try {
        //generate a process id
        processId = Math.random().toString(36).substring(2, 9); // Unique ID for this process invocation
        
        //init collections
        await initCollections(processId);

        if (strategyRunning) {
            console.log(`[${chalk.green(processId)}]: Strategy already running, preventing overlap.`);
            return;
        }
        strategyRunning = true;
        console.log(`[${chalk.green(processId)}]: Starting strategy...`);

        // set Timezone
        config.timezone = await setTimeZone(processId);
        if (config.timezone != "") {
            await postData({
                type: "timezone",
                timezone: config.timezone,
            });
        } else {
            console.log(`[${chalk.red(processId)}]: ❌ Error posting the timezone`);
            await saveLog("❌ Error posting the timezone");
        }

        //check if its weekend
        if (await checkIfWeekend()) {
            tradesToday
            console.log(`[${chalk.red(processId)}]: Weekend — no trading 🚫`);
            await saveLog("Weekend — no trading 🚫");
            tradesToday = 0;
            await sleepUntilNextAsiaSession();
            return await restartStrategy(0, processId);
        }

        

        //set the timer to auto reexecute the strategie the next day
        const delay = await msUntilNextAsiaSession();
        setTimeout(async () => {
            console.log(`[${chalk.red(processId)}]: 🌅 New Asia session... Restarting the strategy`);
            saveLog("🌅 New Asia session... Restarting the strategy");
            tradesToday = 0;
            return await restartStrategy(0, processId);
        }, delay);

        // Check news first
        const events = await getNews(processId);
        const newsRules = await newsDecision(events);
        console.log(`[${chalk.green(processId)}]: ${newsRules.decision}`);
        await saveLog(newsRules.decision);
        const newsDB = {
            decision: newsRules.decision,
            events: events
        }
        await saveNews(newsDB);
        if (newsRules.skipDay) {
            await postData({
                type: "telegram",
                msg: `⚠️ *Trading Skipped Today*
                High impact news events detected for ${config.symbol}. No trades will be taken today.
            `
            });
            tradesToday = 0;
            console.log(`[${chalk.yellow.bold(processId)}]: Trading skipped for today due to high-impact news events.`);
            await saveLog("Trading skipped for today due to high-impact news events.");
            await sleepUntilNextAsiaSession();
            return restartStrategy(0, processId); // restart fresh next day
        } else config.tradeQuality += 40;
        if (newsRules.blockTimes.length === 0) config.tradeQuality += 20;
        if (newsRules.warnTimes.length === 0) config.tradeQuality += 10;


        //get todays signal
        const signal = await signalBuilder(twelveData, processId);
        if (!signal || signal.potential === "none") {
            console.log(`[${chalk.red(processId)}]: No valid signal, retrying in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
            await saveLog(`No valid signal, retrying in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
            return await restartStrategy(RESTART_DELAY, processId);
        }
        await postData({
            type: "telegram",
            msg: `📈 *New Signal Detected! ${config.symbol}*
            Potential: ${signal.potential}
        `
        });
        console.log(`[${chalk.green(processId)}]: Final Signal: ${signal.potential}`);
        await saveLog("Final Signal: " + signal.potential);

        //find closest virgin FVG
        const fvg = await findClosestVirginFVG(signal, twelveData);
        if (!fvg) {
            console.log("No virgin FVG found, restarting strategy the next day...");
            saveLog("No virgin FVG found, restarting strategy the next day...");
            await sleepUntilNextAsiaSession();
            return restartStrategy(0, processId);
        }

        if (fvg.fullVirgin) config.tradeQuality += 10;
        await postData({
            type: "telegram",
            msg: `📊 *Closest Virgin FVG*
            Type: ${fvg.type}
            Created At: ${fvg.createdAt}
            Gap Low: ${fvg.gapLow}
           Gap High: ${fvg.gapHigh}
            Virgin: ${fvg.fullVirgin ? "Full" : "50%"}
            `
        });
        console.log(`[${chalk.green(processId)}]: Closest Virgin FVG for signal:`, fvg);
        await saveLog(`📊 *Closest Virgin FVG*
            Type: ${fvg.type}
            Created At: ${fvg.createdAt}
            Gap Low: ${fvg.gapLow}
           Gap High: ${fvg.gapHigh}
            Virgin: ${fvg.fullVirgin ? "Full" : "50%"}
            `);

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
            twelveData,
            processId
        });


        if (result.status === "confirmed") {
            if (!confirmationTimeChecker(newsRules, processId)) {
                await postData({
                    type: "telegram",
                    msg: `⛔ *Trade Cancelled! ${config.symbol}*
                    Trade cancelled due to high-impact news events.
                    `
                });
                console.log(`[${chalk.red(processId)}]: Trade cancelled due to news impact. Restarting strategy in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
                await saveLog(`Trade cancelled due to news impact. Restarting strategy in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
                return await restartStrategy(RESTART_DELAY, processId);
            } else {
                //place trade
                const entryData = await getEntryData(fvg, result.entryCandle, signal.potential);
                const displayedEntryData = {
                    entryPrice: Number((entryData.entryPrice / config.risk.slMultipler).toFixed(3)),
                    tp: Number((entryData.tp / config.risk.slMultipler).toFixed(3)),
                    sl: Number((entryData.sl / config.risk.slMultipler).toFixed(3))
                }
                console.log(`[${chalk.blue.underline(processId)}]: Placing trade with entry data: Entry price ${displayedEntryData.entryPrice}, Stop lose ${displayedEntryData.sl}, Take profit ${displayedEntryData.tp}`);
                await saveLog("Placing trade with entry data: Entry price " + displayedEntryData.entryPrice + ", Stop lose " + displayedEntryData.sl + ", Take profit " + displayedEntryData.tp);
                await executeTradeOnAllAccounts(entryData);
                console.log(`[${chalk.green(processId)}]: Trade placed with succes.`);
                await saveLog("Trade placed with succes.");
                await postData({
                    type: "telegram",
                    msg: `🚀 *Trade Confirmed! ${config.symbol}*
                    Bias: ${signal.potential}
                    Entry Price: ${displayedEntryData.entryPrice}
                    Stop Loss: ${displayedEntryData.sl}
                    Take Profit: ${displayedEntryData.tp}
                    `
                });
                tradesToday++;
                const positionDB = {
                    direction: signal.potential,
                    entryPrice: displayedEntryData.entryPrice,
                    stopLoss: displayedEntryData.sl,
                    takeProfit: displayedEntryData.tp,
                    epic: "CS.D.EURUSD.CFD.IP" // Hardcoded for now, can be passed later
                }
                await savePosition(positionDB);

                await monitorTrade(displayedEntryData.tp, displayedEntryData.sl, signal.potential, processId, twelveData);
                if (tradesToday === config.risk.maxTreadesPerDay) {
                    tradesToday = 0;
                    console.log(`[${chalk.red(processId)}]: Max trades amount for today has been reached, restarting next Asia session...`);
                    await saveLog("Max trades amount for today has been reached, restarting next Asia session...");
                    await sleepUntilNextAsiaSession();
                    return restartStrategy(0, processId);
                } else {
                    console.log(`[${chalk.blue.underline(processId)}]: Trade finished successfully. Restarting strategy in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
                    await saveLog(`Trade finished successfully. Restarting strategy in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
                    return restartStrategy(RESTART_DELAY, processId);
                }
            }
        } if (result.status === "expired") {
            console.log(`[${chalk.red(processId)}]: FVG expired or invalidated. Restarting strategy in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
            await saveLog(`FVG expired or invalidated. Restarting strategy in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
            return restartStrategy(RESTART_DELAY, processId);
        }

    } catch (err) {
        console.error(`[${chalk.red(processId)}]: Strategy error: ${err}`);
        await saveLog("Strategy error: " + err);

        console.log(`[${chalk.red(processId)}]: Retrying strategy in ${RESTART_DELAY / (60 * 1000)} ${RESTART_UNIT}...`);
        return await restartStrategy(RESTART_DELAY, processId);
    }
}

async function restartStrategy(delay = 0, processId) {
    strategyRunning = false;
    if (delay > 0) {
        console.log(`[${chalk.blue.underline(processId)}]: Waiting for ${(delay / (60 * 1000)).toFixed(0)} ${RESTART_UNIT} before restarting...`);
        await sleep(delay);
    }
    console.log(`[${chalk.blue.underline(processId)}]: Restarting strategy...`);
    return runStrategy();
}

module.exports = { runStrategy };
