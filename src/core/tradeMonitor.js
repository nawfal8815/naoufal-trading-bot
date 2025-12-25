const { getLivePrice } = require('../api/dataFeed');
const {sendTelegramMessage} = require("../services/telegram");

function monitorTrade(tpPrice, slPrice) {
    const interval = 15 * 60 * 1000; // 15 minutes in ms
    console.log(`⏱ Starting trade monitor. TP: ${tpPrice}, SL: ${slPrice}`);
    const monitorId = setInterval(async () => {
        try {
            const currentPrice = await getLivePrice();
            console.log(`⏱ Current price for ${symbol}: ${currentPrice}`);

            if (currentPrice >= tpPrice) {
                console.log(`✅ Trade WIN! Price reached TP: ${tpPrice}`);
                sendTelegramMessage(`✅ *Trade WIN! ${config.symbol}*
                Price reached Take Profit: ${tpPrice}
                `, { parse_mode: "Markdown" });
                clearInterval(monitorId);
            } else if (currentPrice <= slPrice) {
                console.log(`❌ Trade LOSE! Price hit SL: ${slPrice}`);
                sendTelegramMessage(`❌ *Trade LOSE! ${config.symbol}*
                Price hit Stop Loss: ${slPrice}
                `, { parse_mode: "Markdown" });
                clearInterval(monitorId);
            } else {
                console.log(`ℹ️ Trade still open. Waiting for next check...`);
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