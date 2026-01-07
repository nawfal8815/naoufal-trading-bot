const { getData, telegramChecked, igMarketsChecked } = require('./queries');
const { sendTelegramMessageID } = require('../src/services/telegram');

async function accountsAproaval() {
    const timeline = setInterval(async () => {
        const snapshot = await getData("UserSettings");
        snapshot.docs.map(doc => {
            if (doc.data().telegramChecked === false && doc.data().telegramChecked !== undefined && doc.data().telegramChatId) {
                sendTelegramMessageID(`Checking Telegram chat ID`, { parse_mode: "Markdown" }, doc.data().telegramChatId);
                telegramChecked(doc.id);
            }
            if (doc.data().igChecked === false && doc.data().igChecked !== undefined && doc.data().igAccount) {
                //Todo: check if the igaccount exists using login method
                console.log("LOGIN");
                igMarketsChecked(doc.id);
            }

        })

    }, 1000 * 5);



}

module.exports = { accountsAproaval };