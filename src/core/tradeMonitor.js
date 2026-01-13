const { getLivePrice } = require('../api/dataFeed');
const { telegramUsersSender } = require("../services/telegram");
const config = require('../../config/config')

function monitorTrade(tpPrice, slPrice, bias) {
    const interval = 15 * 60 * 1000; // 15 minutes in ms
    console.log(`⏱ Starting trade monitor. TP: ${tpPrice}, SL: ${slPrice}`);
    const monitorId = setInterval(async () => {
        try {
            const currentPrice = await getLivePrice();
            console.log(`⏱ Current price for ${config.symbol}: ${currentPrice}`);
            if (bias === "buy") {
                if (currentPrice >= tpPrice) {
                    console.log(`✅ Trade WIN! Price reached TP: ${tpPrice}`);
                    telegramUsersSender(`✅ *Trade WIN! ${config.symbol}*
                Price reached Take Profit: ${tpPrice}
                `, { parse_mode: "Markdown" });
                    clearInterval(monitorId);
                } else if (currentPrice <= slPrice) {
                    console.log(`❌ Trade LOSE! Price hit SL: ${slPrice}`);
                    telegramUsersSender(`❌ *Trade LOSE! ${config.symbol}*
                Price hit Stop Loss: ${slPrice}
                `, { parse_mode: "Markdown" });
                    clearInterval(monitorId);
                } else {
                    console.log(`ℹ️ Trade still open. Waiting for next check...`);
                }
            } else {
                if (currentPrice <= tpPrice) {
                    console.log(`✅ Trade WIN! Price reached TP: ${tpPrice}`);
                    telegramUsersSender(`✅ *Trade WIN! ${config.symbol}*
                Price reached Take Profit: ${tpPrice}
                `, { parse_mode: "Markdown" });
                    clearInterval(monitorId);
                } else if (currentPrice >= slPrice) {
                    console.log(`❌ Trade LOSE! Price hit SL: ${slPrice}`);
                    telegramUsersSender(`❌ *Trade LOSE! ${config.symbol}*
                Price hit Stop Loss: ${slPrice}
                `, { parse_mode: "Markdown" });
                    clearInterval(monitorId);
                } else {
                    console.log(`ℹ️ Trade still open. Waiting for next check...`);
                }
            }
        } catch (err) {
            console.error("❌ Error monitoring trade", err.message);
        }
    }, interval);

    return monitorId; // Returns the interval ID if you want to stop manually
}

module.exports = {
    monitorTrade
};