const axios = require("axios");
const config = require("../../config/config");
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

async function login() {
    const res = await axios.post(
        `${config.igMarkets.baseUrl}/session`,
        {
            identifier: config.igMarkets.username,
            password: config.igMarkets.password
        },
        {
            headers: {
                ...headersBase,
                VERSION: "2"
            },
            timeout: 10000
        }
    );

    session.CST = res.headers["cst"];
    session.X_SECURITY_TOKEN = res.headers["x-security-token"];

    console.log("✅ IG authenticated");
}


function authHeaders() {
    if (!session.CST || !session.X_SECURITY_TOKEN) {
        throw new Error("Not authenticated");
    }

    return {
        ...headersBase,
        CST: session.CST,
        "X-SECURITY-TOKEN": session.X_SECURITY_TOKEN
    };
}


async function getAccount(accountID) {
    const res = await axios.get(
        `${config.igMarkets.baseUrl}/accounts`,
        {
            headers: {
                ...authHeaders(),
                VERSION: "1"
            }
        }
    );
    const account = res.data.accounts.find(acc => acc.accountId === accountID);
    if (!account) {
        throw new Error(`Account ID ${accountID} not found`);
    }
    return account;
}

/**
 * Execute a trade with options for stop loss and take profit
 * @param {string} accountId - IG account ID
 * @param {string} epic - Market identifier, e.g., "CS.D.EURUSD.CFD.IP"
 * @param {"BUY"|"SELL"} direction - Buy or Sell
 * @param {number} size - Number of contracts/units
 * @param {number} stopLossDistance - Stop loss distance in points/pips
 * @param {number} takeProfitDistance - Take profit distance in points/pips
 */
async function executeTrade(accountId, epic, direction, size, stopLossDistance = 10, takeProfitDistance = 20) {
    try {
        // Get market info to find current price
        const marketRes = await axios.get(
            `${config.igMarkets.baseUrl}/markets/${epic}`,
            { headers: { ...authHeaders(), VERSION: "3" } }
        );

        const market = marketRes.data.market;
        const currentPrice = direction === "BUY" ? market.offer : market.bid;

        // Stop loss and take profit prices
        const stopLevel = direction === "BUY" ? currentPrice - stopLossDistance : currentPrice + stopLossDistance;
        const limitLevel = direction === "BUY" ? currentPrice + takeProfitDistance : currentPrice - takeProfitDistance;

        const body = {
            accountId,
            epic,
            direction,
            size,
            orderType: "MARKET",        // Instant execution
            currencyCode: "USD",
            guaranteedStop: false,      // Set true if you want guaranteed stop (may cost more)
            stopLevel,                  // Stop loss price
            limitLevel                  // Take profit price
        };

        const res = await axios.post(
            `${config.igMarkets.baseUrl}/positions/otc`,
            body,
            { headers: { ...authHeaders(), VERSION: "2" } }
        );

        console.log("✅ Trade executed:", res.data);
        return res.data;
    } catch (err) {
        console.error("❌ Trade failed", err.response?.data || err.message);
        throw err;
    }
}


async function stopAllTrades() {
    try {
        // Get all open positions
        const res = await axios.get(
            `${config.igMarkets.baseUrl}/positions`,
            { headers: { ...authHeaders(), VERSION: "2" } }
        );

        const positions = res.data.positions || [];

        if (positions.length === 0) {
            console.log("✅ No open positions to close");
            return;
        }

        // Loop through positions and close each
        for (const pos of positions) {
            const closeBody = {
                dealId: pos.dealId,
                direction: pos.direction === "BUY" ? "SELL" : "BUY",
                orderType: "MARKET",
                size: pos.size,
                expiry: "DFB"
            };

            await axios.post(
                `${config.igMarkets.baseUrl}/positions/otc`,
                closeBody,
                { headers: { ...authHeaders(), VERSION: "2" } }
            );

            console.log(`✅ Closed position ${pos.dealId}`);
        }

    } catch (err) {
        console.error("❌ Failed to stop all trades", err.response?.data || err.message);
        throw err;
    }
}

function scheduleStopAll() {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999); // End of current day

    const timeout = endOfDay.getTime() - now.getTime();

    console.log(`⏰ stopAllTrades scheduled in ${Math.floor(timeout / 1000)} seconds`);

    setTimeout(() => stopAllTrades(), timeout);
}




module.exports = {
    login,
    getAccount,
    executeTrade,
    scheduleStopAll
};

