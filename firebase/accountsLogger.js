const { getData, telegramChecked, igMarketsChecked, igMarketsundefiened, saveUserBalance } = require('./queries');
const { login, getAccount, executeTrade, scheduleStopAll } = require("../src/services/igMarkets");
const { getLotsize } = require('../src/core/riskManager');
const { sendTelegramMessageID } = require('../src/services/telegram');

async function executeTradeOnAllAccounts(entryData) {
    const snapshot = await getData("UserSettings");
    if (!snapshot || snapshot.empty) return;
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

async function accountsApproval() {
    const processAccounts = async () => {
        const snapshot = await getData("UserSettings");
        if (!snapshot || snapshot.empty) return;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const igAccount = data.igAccount;
            // 1️⃣ Check Telegram
            if (data.telegramChecked === false && data.telegramChecked !== undefined) {
                sendTelegramMessageID(`Checking Telegram chat ID`, { parse_mode: "Markdown" }, data.telegramChatId);
                await telegramChecked(doc.id);
            }

            // 3️⃣ IG account not checked yet
            if (data.igChecked === false && data.igChecked !== undefined && data.igUndefined === false && data.igUndefined !== undefined) {
                try {
                    const authHeaders = await login(igAccount.apiKey, igAccount.username, igAccount.password);
                    const account = await getAccount(igAccount.accountID, authHeaders);
                    await igMarketsChecked(doc.id);
                    const balance = account.balance.balance;
                    await saveUserBalance(doc.id, balance);
                } catch (err) {
                    console.log("Error checking IG account", doc.id);
                    await igMarketsundefiened(doc.id);
                }
            }
        }

        // Schedule next run
        setTimeout(processAccounts, 5 * 1000); // 5 seconds
    };

    await processAccounts();
}

async function updateBalance () {
    const processAccounts = async () => {
        const snapshot = await getData("UserSettings");
        if (!snapshot || snapshot.empty) return;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const igAccount = data.igAccount;

            // 2️⃣ IG account already checked
            if (data.igChecked === true && data.igUndefined !== true) {
                try {
                    const authHeaders = await login(igAccount.apiKey, igAccount.username, igAccount.password);
                    const account = await getAccount(igAccount.accountID, authHeaders);
                    const balance = account.balance.balance;
                    await saveUserBalance(doc.id, balance);
                } catch (err) {
                    console.log("Error updating balance for", doc.id);
                }
            }
        }

        // Schedule next run
        setTimeout(processAccounts, 10 * 60 * 1000); // every 10 mins
    };

    await processAccounts();
}


module.exports = { executeTradeOnAllAccounts, accountsApproval, updateBalance }