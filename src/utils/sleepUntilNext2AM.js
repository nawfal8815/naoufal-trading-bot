const { sleep } = require("./sleep");
const config = require("../../config/config");

async function sleepUntilNext2AM() {
    const now = new Date();

    // Get Vilnius date string (YYYY-MM-DD)
    const todayVilnius = now.toLocaleDateString("sv-SE", {
        timeZone: config.timezone
    });

    // Build next day 02:00 Vilnius time
    const next2AM = new Date(`${todayVilnius}T02:00:00`);
    
    // If already past today's 02:00 → move to next day
    if (now >= next2AM) {
        next2AM.setDate(next2AM.getDate() + 1);
    }

    const msToSleep = next2AM.getTime() - now.getTime();

    console.log(
        `⏳ Sleeping until ${next2AM.toLocaleString("en-GB", {
            timeZone: config.timezone
        })}`
    );

    await sleep(msToSleep);
}

module.exports = { sleepUntilNext2AM };
