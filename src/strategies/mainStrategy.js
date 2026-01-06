const { findClosestVirginFVG } = require("../core/fvgDetector");
const { getEntryData, confirmationTimeChecker } = require("../core/riskManager");
const signalBuilder = require("../core/signalBuilder");
const { monitorFVG } = require("../core/fvgMonitor");
const { sleepUntilNextAsiaSession, msUntilNextAsiaSession } = require("../utils/sleepUntilNextAsiaSession");
const { sendTelegramMessage } = require("../services/telegram");
const config = require("../../config/config");
const { newsDecision } = require("../core/newsHandler");
const { getNews } = require('../api/news');
const { login, getAccount, executeTrade, scheduleStopAll } = require("../services/igMarkets");
const { monitorTrade } = require("../core/tradeMonitor");
const { sleep } = require("../utils/sleep");
const { postData } = require("../server/apiClient");
const { setTimeZone, checkIfWeekend } = require("../utils/date");
const { initCollections } = require('../../firebase/initCollections');
const { saveLog, saveDailyInfo, saveNews, savePosition } = require('../../firebase/queries');

let strategyRunning = false; // prevent overlapping runs

async function runStrategy() {

    if (strategyRunning) return;
    strategyRunning = true;

    //init collections
    await initCollections();

    //set the timer to auto reexecute the strategie the next day
    const delay = await msUntilNextAsiaSession();
    setTimeout(() => {
        console.log("🌅 New Asia session... Restarting the strategy");
        saveLog("🌅 New Asia session... Restarting the strategy");
        strategyRunning = false;
        return;
    }, delay);

    //check if its weekend
    if (await checkIfWeekend()) {
    console.log("Weekend — no trading 🚫");
    await saveLog("Weekend — no trading 🚫");
        await sleepUntilNextAsiaSession();
        strategyRunning = false;
        return;
    }

    // set Timezone
    config.timezone = await setTimeZone();
    if (config.timezone != "") {
        await postData({
            type: "timezone",
            timezone: config.timezone,
            offset: new Date().getTimezoneOffset()
        });
    } else {
        console.log("❌ Error posting the timezone");
        await saveLog("❌ Error posting the timezone");
        
    }


    //login to broker
    try {
        await login();
        const account = await getAccount(config.igMarkets.accountID);
        console.log("Account Balance:", account.balance.balance);
        await saveLog("Account Balance:", account.balance.balance);
        config.risk.moneyAtRisk = config.risk.perTrade * account.balance.balance;
        await postData({
            type: "accountDetails",
            account: {accountID: account.accountId, balance: account.balance.balance, moneyAtRisk: config.risk.moneyAtRisk}
        })
        console.log(`💰 Money at Risk per Trade: ${config.risk.moneyAtRisk}`);
        await saveLog(`💰 Money at Risk per Trade: ${config.risk.moneyAtRisk}`);
    } catch (err) {
        console.error("❌ Login failed", err.response?.data || err.message);
        await saveLog("❌ Login failed", err.response?.data || err.message);
        strategyRunning = false;
        // retry after short delay
        console.log("Retrying strategy in 1 minute...");
        saveLog("Retrying strategy in 1 minute...");
        await sleep(60000);
        return;
    }

    await sleep(2000); // brief pause before proceeding

    //running main strategy logic
    try {
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
        if (newsRules != 0 && newsRules.skipDay) {
            sendTelegramMessage(
                `⚠️ *Trading Skipped Today*
                High impact news events detected for ${config.symbol}. No trades will be taken today.
            `, { parse_mode: "Markdown" });
            strategyRunning = false;
            config.tradeQuality -= 50;
            await sleepUntilNextAsiaSession();
            return; // restart fresh next day
        } else if (newsRules.blockTimes.length > 0) {
            config.tradeQuality -= 20;
        } else if (newsRules.warnTimes.length > 0) config.tradeQuality -= 10;

        await sleep(2000); // brief pause before proceeding


        //get todays signal
        const signal = await signalBuilder();
        if (!signal || signal.potential === "none") {
            console.log("No valid signal, retrying in 30 secs...");
            saveLog("No valid signal, retrying in 30 secs...");
            strategyRunning = false;
            await sleep(30000);
            return;
        }

        sendTelegramMessage(
            `📈 *New Signal Detected! ${config.symbol}*
            Potential: ${signal.potential}
        `, { parse_mode: "Markdown" });
        console.log("Final Signal:", signal.potential);
        await saveLog("Final Signal:", signal.potential);

        await sleep(2000); // brief pause before proceeding

        //find closest virgin FVG
        const fvg = await findClosestVirginFVG(signal);
        if (!fvg) {
            console.log("No virgin FVG found, restarting strategy the next day...");
            saveLog("No virgin FVG found, restarting strategy the next day...");
            strategyRunning = false;
            await sleepUntilNextAsiaSession();
            return;
        }

        if (!fvg.fullVirgin) config.tradeQuality -= 10;



        sendTelegramMessage(
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
        await saveLog("Closest Virgin FVG for signal:", fvg);

        await sleep(2000); // brief pause before proceeding

        //to add later: check if the market is ranged or trending before monitoring FVG
        // 10% quality of the trade if its not ranged
        //TO DO!!

        const dailyInfoDB = {
            bias: signal.potential,
            quality: config.tradeQuality,
            target: signal.target,
            fvg: {
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
            signal
        });



        if (result.status === "confirmed") {
            if (newsRules != 0 && !confirmationTimeChecker(newsRules)) {
                sendTelegramMessage(
                    `⛔ *Trade Cancelled! ${config.symbol}*
                    Trade cancelled due to high-impact news events.
                    `, { parse_mode: "Markdown" });
                console.log("Trade cancelled due to news impact.");
                await saveLog("Trade cancelled due to news impact.");
                strategyRunning = false;
                await sleepUntilNextAsiaSession();
                return; // restart fresh next day
            } else {
                //place trade
                const entryData = await getEntryData(result.fvg, result.entryCandle, signal.potential);
                console.log("Placing trade with entry data:", entryData);
                await saveLog("Placing trade with entry data:", entryData);

                sendTelegramMessage(
                    `🚀 *Trade Confirmed! ${config.symbol}*
                    Bias: ${signal.potential}
                    Entry Price: ${entryData.entryPrice}
                    Stop Loss: ${entryData.stopLoss}
                    Take Profit: ${entryData.takeProfit}
                    Position Size: ${entryData.positionSize} units
                    `, { parse_mode: "Markdown" });

                await executeTrade(
                    "CS.D.EURUSD.CFD.IP",
                    signal.potential === "buy" ? "BUY" : "SELL",
                    entryData.positionSize,
                    entryData.sl,
                    entryData.tp
                );

                const positionDB = {
                    direction: signal.potential,
                    entryPrice: entryData.entryPrice,
                    stopLoss: entryData.sl,
                    takeProfit: entryData.tp,
                    positionSize: entryData.positionSize,
                    epic: "CS.D.EURUSD.CFD.IP" // Hardcoded for now, can be passed later
                }
                await savePosition(positionDB);

                monitorTrade(entryData.takeProfit, entryData.stopLoss, signal.potential);
                scheduleStopAll();
                console.log("Trade executed successfully. Strategy cycle complete for the day.");
                await saveLog("Trade executed successfully. Strategy cycle complete for the day.");
                strategyRunning = false;
                await sleepUntilNextAsiaSession();
                return; // restart fresh next day
            }
        } if (result.status === "expired-day") {
            console.log("❌ Day expired. Waiting until next session...");
            saveLog("❌ Day expired. Waiting until next session...");
            strategyRunning = false;
            await sleepUntilNextAsiaSession();
            return // restart fresh next day
        } else {
            console.log("FVG expired or invalidated. Restarting strategy...");
            saveLog("FVG expired or invalidated. Restarting strategy...");
            strategyRunning = false;
            return;
        }

    } catch (err) {
        console.error("Strategy error:", err);
        strategyRunning = false;
        // retry after short delay
        console.log("Retrying strategy in 30 seconds...");
        saveLog("Retrying strategy in 30 seconds...");
        await new Promise(r => setTimeout(r, 30000));
        return;
    } finally {
        if (!strategyRunning) return runStrategy();
    }
}

module.exports = { runStrategy };
