const { getLivePrice } = require('../api/dataFeed');
const config = require('../../config/config')
const chalk = require('chalk').default;

function monitorTrade(tpPrice, slPrice, bias, processId) {
    const interval = 15 * 60 * 1000; // 15 minutes in ms
    console.log(`[${chalk.green(processId)}]: ⏱ Starting trade monitor. TP: ${tpPrice}, SL: ${slPrice}`);
    const monitorId = setInterval(async () => {
        try {
            const currentPrice = await getLivePrice();
            console.log(`[${chalk.green(processId)}]: ⏱ Current price for ${config.symbol}: ${currentPrice}`);
            if (bias === "buy") {
                if (currentPrice >= tpPrice) {
                    console.log(`[${chalk.green(processId)}]: ✅ Trade WIN! Price reached TP: ${tpPrice}`);
                    //     telegramUsersSender(`✅ *Trade WIN! ${config.symbol}*
                    // Price reached Take Profit: ${tpPrice}
                    // `, { parse_mode: "Markdown" });
                    await postData({
                        type: "telegram",
                        msg: `✅ *Trade WIN! ${config.symbol}*
                Price reached Take Profit: ${tpPrice}
                `
                    });
                    clearInterval(monitorId);
                } else if (currentPrice <= slPrice) {
                    console.log(`[${chalk.red(processId)}]: ❌ Trade LOSE! Price hit SL: ${slPrice}`);
                    //     telegramUsersSender(`❌ *Trade LOSE! ${config.symbol}*
                    // Price hit Stop Loss: ${slPrice}
                    // `, { parse_mode: "Markdown" });
                    await postData({
                        type: "telegram",
                        msg: `❌ *Trade LOSE! ${config.symbol}*
                Price hit Stop Loss: ${slPrice}
                `
                    });
                    clearInterval(monitorId);
                } else {
                    console.log(`[${chalk.backgroundColorNames.underline(processId)}]: ℹ️ Trade still open. Waiting for next check...`);
                }
            } else {
                if (currentPrice <= tpPrice) {
                    console.log(`[${chalk.green(processId)}]: ✅ Trade WIN! Price reached TP: ${tpPrice}`);
                    //     telegramUsersSender(`✅ *Trade WIN! ${config.symbol}*
                    // Price reached Take Profit: ${tpPrice}
                    // `, { parse_mode: "Markdown" });
                    await postData({
                        type: "telegram",
                        msg: `✅ *Trade WIN! ${config.symbol}*
                Price reached Take Profit: ${tpPrice}
                `
                    });
                    clearInterval(monitorId);
                } else if (currentPrice >= slPrice) {
                    console.log(`[${chalk.red(processId)}]: ❌ Trade LOSE! Price hit SL: ${slPrice}`);
                    //     telegramUsersSender(`❌ *Trade LOSE! ${config.symbol}*
                    // Price hit Stop Loss: ${slPrice}
                    // `, { parse_mode: "Markdown" });
                    await postData({
                        type: "telegram",
                        msg: `❌ *Trade LOSE! ${config.symbol}*
                Price hit Stop Loss: ${slPrice}
                `
                    });
                    clearInterval(monitorId);
                } else {
                    console.log(`[${chalk.blue.underline(processId)}]: ℹ️ Trade still open. Waiting for next check...`);
                }
            }
        } catch (err) {
            console.error(`[${chalk.red(processId)}]: ❌ Error monitoring trade ${err.message}`);
        }
    }, interval);

    return monitorId; // Returns the interval ID if you want to stop manually
}

module.exports = {
    monitorTrade
};