const { sleep } = require("./sleep");
const config = require("../../config/config");
const { getNextAsiaSessionDate } = require("./date");
const { sendTelegramMessage } = require("../services/telegram");

async function sleepUntilNextAsiaSession() {
    const now = new Date().toISOString();
    const asianSessionDate = getNextAsiaSessionDate();

    const msToSleep = new Date(asianSessionDate).getTime() - new Date(now).getTime();
    console.log(
        `⏳ Sleeping until ${asianSessionDate}`
    );
    sendTelegramMessage(
        `⏳ *Sleeping Until Next Asia Session*
        The strategy is pausing until the next Asia session starts at ${asianSessionDate}.
    `, { parse_mode: "Markdown" });


    await sleep(msToSleep);
}

module.exports = { sleepUntilNextAsiaSession };
