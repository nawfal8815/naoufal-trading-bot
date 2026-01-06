const axios = require("axios");
const config = require("../../config/config");
const { sleep } = require('../utils/sleep');

const IG_BASE_URL = config.igMarkets.baseUrl;

const headersBase = {
    "X-IG-API-KEY": config.igMarkets.apiKey,
    "Content-Type": "application/json",
    "Accept": "application/json; charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (Node.js Trading Bot)"
};

let session = {
    CST: null,
    X_SECURITY_TOKEN: null
};

/* -------------------- AUTH -------------------- */

async function login() {
    const res = await axios.post(
        `${IG_BASE_URL}/session`,
        {
            identifier: config.igMarkets.username,
            password: config.igMarkets.password
        },
        {
            headers: { ...headersBase, VERSION: "2" },
            timeout: 10000
        }
    );

    session.CST = res.headers["cst"];
    session.X_SECURITY_TOKEN = res.headers["x-security-token"];

    console.log("✅ IG authenticated");
}

function authHeaders() {
    if (!session.CST || !session.X_SECURITY_TOKEN) {
        throw new Error("Not authenticated with IG");
    }

    return {
        ...headersBase,
        CST: session.CST,
        "X-SECURITY-TOKEN": session.X_SECURITY_TOKEN
    };
}

/* -------------------- ACCOUNT -------------------- */

async function getAccount(accountID) {
    const res = await axios.get(
        `${IG_BASE_URL}/accounts`,
        { headers: { ...authHeaders(), VERSION: "1" } }
    );

    const account = res.data.accounts.find(acc => acc.accountId === accountID);
    if (!account) {
        throw new Error(`Account ID ${accountID} not found`);
    }

    return account;
}

/* -------------------- TRADE -------------------- */

/**
 * Execute a market trade using ABSOLUTE price levels
 */
async function executeTrade(epic, direction, size, stopDistance, limitDistance) {
    try {
        const marketRes = await axios.get(
            `${IG_BASE_URL}/markets/${epic}`,
            { headers: { ...authHeaders(), VERSION: "3" } }
        );

        const { snapshot } = marketRes.data;
        console.log(marketRes);
        return;

        if (!snapshot || snapshot.bid == null || snapshot.offer == null || snapshot.marketStatus !== "TRADEABLE") {
            throw new Error("Market price snapshot unavailable");
        }

        const body = {
            epic,
            direction,
            orderType: "MARKET",
            size,
            forceOpen: true,
            guaranteedStop: false,
            currencyCode: "USD",
            stopDistance,
            limitDistance
        };

        const res = await axios.post(
            `${IG_BASE_URL}/positions/otc`,
            body,
            { headers: { ...authHeaders(), VERSION: "2" } }
        );

        const dealReference = res.data.dealReference;

        // ⏳ wait briefly (IG needs time)
        await sleep(500);

        const confirm = await confirmDeal(dealReference);

        if (confirm.dealStatus !== "ACCEPTED") {
            throw new Error(
                `Deal rejected: ${confirm.dealStatus} – ${confirm.reason || "unknown"}`
            );
        }

        console.log("✅ Trade confirmed:", confirm.dealId);
        return confirm;


    } catch (err) {
        console.error("❌ Trade failed", err.response?.data || err.message);
        throw err;
    }
}


/* -------------------- CLOSE ALL -------------------- */

async function stopAllTrades() {
    try {
        const res = await axios.get(
            `${IG_BASE_URL}/positions`,
            { headers: { ...authHeaders(), VERSION: "2" } }
        );

        const positions = res.data.positions || [];
        if (!positions.length) {
            console.log("✅ No open positions to close");
            return;
        }

        for (const pos of positions) {
            await axios.delete(
                `${IG_BASE_URL}/positions/otc`,
                {
                    headers: { ...authHeaders(), VERSION: "1" },
                    params: {
                        dealId: pos.dealId,
                        direction: pos.direction === "BUY" ? "SELL" : "BUY",
                        size: pos.size,
                        orderType: "MARKET"
                    }
                }
            );


            console.log(`✅ Closed position ${pos.dealId}`);
        }
    } catch (err) {
        console.error("❌ Failed to stop all trades", err.response?.data || err.message);
        throw err;
    }
}

/* -------------------- SCHEDULER -------------------- */

function scheduleStopAll() {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const timeout = endOfDay.getTime() - now.getTime();
    console.log(`⏰ stopAllTrades scheduled in ${Math.floor(timeout / 1000)} seconds`);

    setTimeout(stopAllTrades, timeout);
}

async function confirmDeal(dealReference) {
    const res = await axios.get(
        `${IG_BASE_URL}/confirms/${dealReference}`,
        { headers: { ...authHeaders(), VERSION: "1" } }
    );

    return res.data;
}


/* -------------------- TEST (REMOVE IN PROD) -------------------- */

// (async () => {
//     await login();
//     await executeTrade(
//         "CS.D.EURUSD.CFD.IP",
//         "BUY",
//         1,          // ✅ MUST be integer ≥ 1
//         20,      // stopDistance
//         40       // limitDistance
//     );
// })();

/* -------------------- EXPORTS -------------------- */

module.exports = {
    login,
    getAccount,
    executeTrade,
    scheduleStopAll
};