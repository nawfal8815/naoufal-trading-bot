const { getData, telegramChecked, igMarketsChecked, igMarketsundefiened } = require('./queries');
const { login, getAccount, executeTrade, scheduleStopAll } = require("../src/services/igMarkets");
const { getLotsize } = require('../src/core/riskManager');
const { sendTelegramMessageID } = require('../src/services/telegram');

async function executeTradeOnAllAccounts(entryData) {
    const snapshot = await getData("UserSettings");
    if (!snapshot.size) return;
    snapshot.docs.map(async doc => {
        try {
            if (doc.data().igAccount !== undefined && doc.data().igAccount.igChecked) {
                const igAccount = doc.data().igAccount;
                const authHeaders = await login(igAccount.apiKey, igAccount.username, igAccount.password);
                const account = await getAccount(igAccount.accountID, authHeaders);
                const balance = account.balance.balance;
                const lotSize = await getLotsize(entryData, balance);
                await executeTrade(
                    "CS.D.EURUSD.CFD.IP",
                    signal.potential === "buy" ? "BUY" : "SELL",
                    lotSize > 1 ?? 1,
                    entryData.sl,
                    entryData.tp
                );
                scheduleStopAll(igAccount.apiKey, igAccount.username, igAccount.password);
            }
        } catch (err) {
            console.log("Connection err: ", err);
            return;
        }
    })
}

async function accountsAproaval() {
    const timeline = setInterval(async () => {
        const snapshot = await getData("UserSettings");
        snapshot.docs.map(async doc => {
            if (doc.data().telegramChecked === false && doc.data().telegramChecked !== undefined && doc.data().telegramChatId) {
                sendTelegramMessageID(`Checking Telegram chat ID`, { parse_mode: "Markdown" }, doc.data().telegramChatId);
                telegramChecked(doc.id);
            }
            if (doc.data().igChecked === false && doc.data().igChecked !== undefined && doc.data().igAccount && !doc.data().igUndefiened) {
                try {
                    const igAccount = doc.data().igAccount;
                    await login(igAccount.apiKey, igAccount.username, igAccount.password);
                    igMarketsChecked(doc.id);
                } catch (err) {
                    igMarketsundefiened(doc.id);
                    return;
                }

            }
        })

    }, 1000 * 5);



}

module.exports = { executeTradeOnAllAccounts, accountsAproaval }