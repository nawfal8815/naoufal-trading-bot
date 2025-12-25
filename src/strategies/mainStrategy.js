const { findClosestVirginFVG } = require("../core/fvgDetector");
const { getEntryData, confirmationTimeChecker } = require("../core/riskManager");
const signalBuilder = require("../core/signalBuilder");
const { monitorFVG } = require("../core/fvgMonitor");
const { sleepUntilNext2AM } = require("../utils/sleepUntilNext2AM");
const { sendTelegramMessage } = require("../services/telegram");
const config = require("../../config/config");
const { newsDecision } = require("../core/newsHandler");
const { login, getAccount, executeTrade, scheduleStopAll } = require("../services/igMarkets");
const { monitorTrade } = require("../core/tradeMonitor");
const { sleep } = require("../utils/sleep");

let strategyRunning = false; // prevent overlapping runs

async function runStrategy() {

    if (strategyRunning) return;
    strategyRunning = true;

    //login to broker
    try {
        await login();
        const account = await getAccount(config.igMarkets.accountID);
        console.log("Account Balance:", account.balance.balance);
        const moneyAtRisk = config.risk.perTrade * account.balance.balance;
        config.risk.moneyAtRisk = moneyAtRisk;
        console.log(`💰 Money at Risk per Trade: ${config.risk.moneyAtRisk}`);
    } catch (err) {
        console.error("❌ Login failed", err.response?.data || err.message);
        strategyRunning = false;
        // retry after short delay
        console.log("Retrying strategy in 30 seconds...");
        await new Promise(r => setTimeout(r, 30000));
        return runStrategy();
    }

    await sleep(2000); // brief pause before proceeding

    //running main strategy logic
    try {
        // Check news first
        const newsRules = await newsDecision();
        if (newsRules === 0) {
            console.log("No significant news events today, proceeding with strategy.");
        } else if (newsRules != 0 && newsRules.skipDay) {
            console.log("⚠️ High impact news today, skipping trading for the day.");
            sendTelegramMessage(
                `⚠️ *Trading Skipped Today*
                High impact news events detected for ${config.symbol}. No trades will be taken today.
            `, { parse_mode: "Markdown" });
            strategyRunning = false;
            await sleepUntilNext2AM();
            return runStrategy(); // restart fresh next day
        }

        await sleep(2000); // brief pause before proceeding

        //get todays signal
        const signal = await signalBuilder();
        if (!signal || signal.potential === "none") {
            console.log("No valid signal, retrying in 10 secs...");
            strategyRunning = false;
            await new Promise(r => setTimeout(r, 10000));
            return runStrategy();
        }

        sendTelegramMessage(
            `📈 *New Signal Detected! ${config.symbol}*
            Potential: ${signal.potential}
        `, { parse_mode: "Markdown" });
        console.log("Final Signal:", signal.potential);

        await sleep(2000); // brief pause before proceeding

        //find closest virgin FVG
        const fvg = await findClosestVirginFVG(signal.potential);
        if (!fvg) {
            console.log("No virgin FVG found, restarting strategy the next day...");
            strategyRunning = false;
            await sleepUntilNext2AM();
            return runStrategy();
        }
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
        
        await sleep(2000); // brief pause before proceeding

        //to add later: check if the market is ranged or trending before monitoring FVG
        //TO DO!!

        //monitor FVG for confirmation
        const result = await monitorFVG({
            fvg,
            bias: signal.potential,
            target: signal.target
        });


        if (result.status === "confirmed") {
            if (newsRules != 0 && !confirmationTimeChecker(newsRules)) {
                sendTelegramMessage(
                    `⛔ *Trade Cancelled! ${config.symbol}*
                    Trade cancelled due to high-impact news events.
                    `, { parse_mode: "Markdown" });
                console.log("Trade cancelled due to news impact.");
                strategyRunning = false;
                await sleepUntilNext2AM();
                return runStrategy(); // restart fresh next day
            } else {
                //place trade
                const entryData = getEntryData(result.fvg, result.entryCandle, signal.potential);
                console.log("Placing trade with entry data:", entryData);

                sendTelegramMessage(
                    `🚀 *Trade Confirmed! ${config.symbol}*
                    Bias: ${signal.potential}
                    Entry Price: ${entryData.entryPrice}
                    Stop Loss: ${entryData.stopLoss}
                    Take Profit: ${entryData.takeProfit}
                    Position Size: ${entryData.positionSize} units
                    `, { parse_mode: "Markdown" });

                await executeTrade(
                    config.igMarkets.accountID,
                    "CS.D.EURUSD.CFD.IP",
                    signal.potential === "buy" ? "BUY" : "SELL",
                    entryData.positionSize,
                    entryData.sl,
                    entryData.tp
                );
                monitorTrade(entryData.takeProfit, entryData.stopLoss);
                scheduleStopAll();
                console.log("Trade executed successfully. Strategy cycle complete for the day.");
                strategyRunning = false;
                await sleepUntilNext2AM();
                return runStrategy(); // restart fresh next day
            }
        } if (result.status === "expired-day") {
            console.log("❌ Day expired. Waiting until next session...");
            strategyRunning = false;
            await sleepUntilNext2AM();
            return runStrategy(); // restart fresh next day
        } else {
            console.log("FVG expired or invalidated. Restarting strategy...");
            strategyRunning = false;
            return runStrategy();
        }

    } catch (err) {
        console.error("Strategy error:", err);
        strategyRunning = false;
        // retry after short delay
        console.log("Retrying strategy in 30 seconds...");
        await new Promise(r => setTimeout(r, 30000));
        return runStrategy();
    } finally {
        strategyRunning = false;
        return runStrategy();
    }
}

module.exports = { runStrategy };
