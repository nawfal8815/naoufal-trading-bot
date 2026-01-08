const config = require("../../config/config");
const { sendTelegramMessage } = require("../services/telegram");
const { timeToMinutes } = require("../utils/date");

async function getEntryData(fvg, candle, bias) {
    if (bias === "buy") {
        const slLevel = fvg.gapLow < candle.low ? fvg.gapLow : candle.low;
        const SL = (candle.close - slLevel < config.risk.pips ? candle.close - config.risk.pips : slLevel);
        const TP = (candle.close + ((candle.close - SL) * config.risk.RR));
        const ENTRY_PRICE = candle.close;
        return {
            bias,
            entryPrice: Number(ENTRY_PRICE * config.risk.slMultipler.toFixed(3)),
            sl: Number((SL * config.risk.slMultipler).toFixed(3)),
            tp: Number((TP * config.risk.slMultipler).toFixed(3)),
            slDistance: Number(((ENTRY_PRICE - SL) * config.risk.slMultipler).toFixed(3)),
            tpDistance: Number(((TP - ENTRY_PRICE) * config.risk.slMultipler).toFixed(3))
        };
    } else if (bias === "sell") {
        const slLevel = fvg.gapHigh > candle.high ? fvg.gapHigh : candle.high;
        const SL = (slLevel - candle.close < config.risk.pips ? candle.close + config.risk.pips : slLevel);
        const TP = (candle.close - ((SL - candle.close) * config.risk.RR));
        const ENTRY_PRICE = candle.close;
        return {
            bias,
            entryPrice: Number(ENTRY_PRICE * config.risk.slMultipler.toFixed(3)),
            sl: Number((SL * config.risk.slMultipler).toFixed(3)),
            tp: Number((TP * config.risk.slMultipler).toFixed(3)),
            slDistance: Number(((SL - ENTRY_PRICE) * config.risk.slMultipler).toFixed(3)),
            tpDistance: Number(((ENTRY_PRICE - TP) * config.risk.slMultipler).toFixed(3))
        };
    }
}

async function getLotsize(entryData, balance) {
    const moneyAtRisk = balance * config.risk.perTrade;
    if (entryData.bias === "buy") {
        return Number((moneyAtRisk / ((entryData.entryPrice - SL) * config.risk.multiplyer)).toFixed(3));
    }
    if (entryData.bias === "sell") {
        return Number((moneyAtRisk / ((SL - entryData.entryPrice) * config.risk.multiplyer)).toFixed(3));
    }

}

async function confirmationTimeChecker(rules) {

    let warningIssued = false;
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


module.exports = { getEntryData, confirmationTimeChecker, getLotsize };