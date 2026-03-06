const config = require("../../config/config");
const { timeToMinutes } = require("../utils/date");
const { postData } = require("../server/apiClient");
const chalk = require('chalk').default;

const fixerNumber = config.pipsFixer;

async function getEntryData(fvg, candle, bias) {
    if (bias === "buy") {
        const slLevel = fvg.gapLow < candle.low ? fvg.gapLow : candle.low;
        const SL = (candle.close - slLevel < config.risk.pips ? candle.close - config.risk.pips : slLevel);
        const TP = (candle.close + ((candle.close - SL) * config.risk.RR));
        const ENTRY_PRICE = candle.close;
        return {
            bias,
            entryPrice: Number(ENTRY_PRICE * config.risk.slMultipler.toFixed(fixerNumber)),
            sl: Number((SL * config.risk.slMultipler).toFixed(fixerNumber)),
            tp: Number((TP * config.risk.slMultipler).toFixed(fixerNumber)),
            slDistance: Number(((ENTRY_PRICE - SL) * config.risk.slMultipler).toFixed(fixerNumber)),
            tpDistance: Number(((TP - ENTRY_PRICE) * config.risk.slMultipler).toFixed(fixerNumber))
        };
    } else if (bias === "sell") {
        const slLevel = fvg.gapHigh > candle.high ? fvg.gapHigh : candle.high;
        const SL = (slLevel - candle.close < config.risk.pips ? candle.close + config.risk.pips : slLevel);
        const TP = (candle.close - ((SL - candle.close) * config.risk.RR));
        const ENTRY_PRICE = candle.close;
        return {
            bias,
            entryPrice: Number(ENTRY_PRICE * config.risk.slMultipler.toFixed(fixerNumber)),
            sl: Number((SL * config.risk.slMultipler).toFixed(fixerNumber)),
            tp: Number((TP * config.risk.slMultipler).toFixed(fixerNumber)),
            slDistance: Number(((SL - ENTRY_PRICE) * config.risk.slMultipler).toFixed(fixerNumber)),
            tpDistance: Number(((ENTRY_PRICE - TP) * config.risk.slMultipler).toFixed(fixerNumber))
        };
    }
}

async function getLotsize(entryData, balance) {
    const moneyAtRisk = balance * config.risk.perTrade;
    if (entryData.bias === "buy") {
        return Number((moneyAtRisk / ((entryData.entryPrice - entryData.sl) * config.risk.multiplyer)).toFixed(fixerNumber));
    }
    if (entryData.bias === "sell") {
        return Number((moneyAtRisk / ((entryData.sl - entryData.entryPrice) * config.risk.multiplyer)).toFixed(fixerNumber));
    }

}

async function confirmationTimeChecker(rules, processId) {

    let warningIssued = false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 🚨 High impact events
    for (const time of rules.blockTimes) {
        const eventMinutes = timeToMinutes(time);
        if (eventMinutes !== null && currentMinutes < eventMinutes) {
            console.log(`[${chalk.red(processId)}]: ⛔ High-impact event later today. Trading skipped.`);
            return false;
        }
    }

    // ⚠️ Medium impact events
    for (const time of rules.warnTimes) {
        const eventMinutes = timeToMinutes(time);
        if (eventMinutes !== null && currentMinutes < eventMinutes) {
            warningIssued = true;
            console.log(`[${chalk.yellow.bold(processId)}]: ⚠️ Medium-impact event later today. Trade with caution.`);
            return true;
        }
    }

    if (warningIssued) {
        await postData({
            type: "telegram",
            msg: `⚠️ *Caution Advised*
            Medium-impact news events are scheduled later today for ${config.symbol}. Please trade with caution.
        `
        });
        warningIssued = false;
    }

    // ✅ No blocking events
    return true;
}


module.exports = { getEntryData, confirmationTimeChecker, getLotsize };