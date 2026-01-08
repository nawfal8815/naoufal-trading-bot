const axios = require("axios");
const config = require("../../config/config");
const { sleep } = require('../utils/sleep');

const IG_BASE_URL = config.igMarkets.baseUrl;


/* -------------------- AUTH -------------------- */

async function login(apiKey, username, password) {
    const headersBase = {
        "X-IG-API-KEY": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Node.js Trading Bot)"
    };
    let session = {
        CST: null,
        X_SECURITY_TOKEN: null
    };
    const res = await axios.post(
        `${IG_BASE_URL}/session`,
        {
            identifier: username,
            password: password
        },
        {
            headers: { ...headersBase, VERSION: "2" },
            timeout: 10000
        }
    );

    session.CST = res.headers["cst"];
    session.X_SECURITY_TOKEN = res.headers["x-security-token"];
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

async function getAccount(accountID, authHeaders) {
    const res = await axios.get(
        `${IG_BASE_URL}/accounts`,
        { headers: { ...authHeaders, VERSION: "1" } }
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
async function executeTrade(epic, direction, size, stopLevel, limitLevel, authHeaders) {
    try {
        const marketRes = await axios.get(
            `${IG_BASE_URL}/markets/${epic}`,
            { headers: { ...authHeaders, VERSION: "3" } }
        );

        const { snapshot } = marketRes.data;


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
            expiry: "-"
        };

        if (stopLevel !== null) body.stopLevel = stopLevel;
        if (limitLevel !== null) body.limitLevel = limitLevel;

        const res = await axios.post(
            `${IG_BASE_URL}/positions/otc`,
            body,
            { headers: { ...authHeaders, VERSION: "2" } }
        );

        const dealReference = res.data.dealReference;

        // ⏳ wait briefly (IG needs time)
        await sleep(500);

        let confirm;
        for (let i = 0; i < 5; i++) {
            confirm = await confirmDeal(dealReference);
            if (confirm.dealStatus === "ACCEPTED" || confirm.dealStatus === "REJECTED") break;
            await sleep(500); // 0.5s delay
        }

        console.log("✅ Trade confirmed:", confirm.dealId);
        return confirm;


    } catch (err) {
        console.error("❌ Trade failed", err.response?.data);
        return;
    }
}


/* -------------------- CLOSE ALL -------------------- */

async function stopAllTrades(authHeaders) {
    try {
        const res = await axios.get(`${IG_BASE_URL}/positions`, {
            headers: { ...authHeaders, VERSION: "2" }
        });

        const positions = res.data.positions || [];
        if (!positions.length) {
            return;
        }

        for (const pos of positions) {
            const p = pos.position;
            const m = pos.market;


            await closePositionDemo(pos);

            console.log(`✅ Closed position ${p.dealId}`);
        }
    } catch (err) {
        console.error("❌ Failed to stop all trades", err.response?.data || err.message);
    }
}


async function closePositionDemo(pos, authHeaders) {
    // pos = { position: {...}, market: {...} }
    const p = pos.position;
    const m = pos.market;

    return await axios.post(
        `${IG_BASE_URL}/positions/otc`,
        {
            epic: m.epic,                       // <-- use market.epic
            direction: p.direction === "BUY" ? "SELL" : "BUY",
            size: p.size,
            orderType: "MARKET",
            forceOpen: false,                    // false = close position
            expiry: "-",                          // CFDs have continuous expiry
            currencyCode: p.currency || "USD",
            guaranteedStop: false
        },
        { headers: { ...authHeaders, VERSION: "2" } }
    );
}


/* -------------------- SCHEDULER -------------------- */

function scheduleStopAll(apiKey, username, password) {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const timeout = endOfDay.getTime() - now.getTime();

    setTimeout(async () => {
        await login(apiKey, username, password);
        stopAllTrades();
    }, timeout);
}

async function confirmDeal(dealReference, authHeaders) {
    const res = await axios.get(
        `${IG_BASE_URL}/confirms/${dealReference}`,
        { headers: { ...authHeaders, VERSION: "1" } }
    );

    return res.data;
}


// (async () => {
//     const authHeaders = await login(config.igMarkets.apiKey, config.igMarkets.username, config.igMarkets.password);
//     const account = await getAccount(config.igMarkets.accountID, authHeaders);
//     console.log(account);
// }) ();


/* -------------------- EXPORTS -------------------- */

module.exports = {
    login,
    getAccount,
    executeTrade,
    scheduleStopAll
};