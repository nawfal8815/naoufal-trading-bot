const { sleep } = require("./sleep");
const config = require("../../config/config");
const { getNextAsiaSessionDate } = require("./date");

async function sleepUntilNextAsiaSession() {
    const now = new Date().toISOString();
    const asianSessionDate = getNextAsiaSessionDate();

    const msToSleep = new Date(asianSessionDate).getTime() - new Date(now).getTime();
    console.log(
        `⏳ Sleeping until ${asianSessionDate}`
    );


    await sleep(msToSleep);
}

async function msUntilNextAsiaSession() {
    const now = new Date().toISOString();
    const asianSessionDate = getNextAsiaSessionDate();

    const msToSleep = new Date(asianSessionDate).getTime() - new Date(now).getTime();


    return msToSleep;
}


module.exports = { sleepUntilNextAsiaSession, msUntilNextAsiaSession };
