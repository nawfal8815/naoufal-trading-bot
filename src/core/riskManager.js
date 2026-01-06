const config = require("../../config/config");
const { sendTelegramMessage } = require("../services/telegram");
const { timeToMinutes } = require("../utils/date");

async function getEntryData(fvg, candle, bias) {
    if (bias === "buy") {
        const slLevel = fvg.gapLow < candle.low ? fvg.gapLow : candle.low;
        const SL = candle.close - slLevel < config.pips ? candle.close - config.pips : slLevel;
        const POSITION_SIZE = config.risk.moneyAtRisk / ((candle.close - SL) * config.multiplyer);
        return {
            entryPrice: candle.close,
            sl: SL * config.slMultipler,
            tp: Math.floor((candle.close + ((candle.close - SL) * config.RR)) * config.slMultipler),
            positionSize: Number(POSITION_SIZE.toFixed(3))
        };
    } else if (bias === "sell") {
        const slLevel = fvg.gapHigh > candle.high ? fvg.gapHigh : candle.high;
        const SL = slLevel - candle.close < config.pips ? candle.close + config.pips : slLevel;
        const POSITION_SIZE = config.risk.moneyAtRisk / ((SL - candle.close) * config.multiplyer);
        return {
            entryPrice: candle.close,
            sl: SL * config.slMultipler,
            tp: (candle.close - ((SL - candle.close) * config.RR)) * config.slMultipler,
            positionSize: Number(POSITION_SIZE.toFixed(3))
        };
    }
}

async function confirmationTimeChecker(rules) {

    const warningIssued = false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 🚨 High impact events
    for (const time of rules.blockTimes) {
        const eventMinutes = timeToMinutes(time);
        if (eventMinutes !== null && currentMinutes < eventMinutes) {
            console.log("⛔ High-impact event later today. Trading skipped.");
            return false;
        }
    }

    // ⚠️ Medium impact events
    for (const time of rules.warnTimes) {
        const eventMinutes = timeToMinutes(time);
        if (eventMinutes !== null && currentMinutes < eventMinutes) {
            warningIssued = true;
            console.log("⚠️ Medium-impact event later today. Trade with caution.");
            return true;
        }
    }

    if (warningIssued) {
        sendTelegramMessage(
            `⚠️ *Caution Advised*
            Medium-impact news events are scheduled later today for ${config.symbol}. Please trade with caution.
        `, { parse_mode: "Markdown" });
        warningIssued = false;
    }

    // ✅ No blocking events
    return true;
}


module.exports = { getEntryData, confirmationTimeChecker };