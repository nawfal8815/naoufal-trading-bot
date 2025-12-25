require("dotenv").config({ path: './config/.env' });

module.exports = {
    broker1: "AlphaVantage",
    broker2: "TwelveData",
    broker3: "OANDA",
    symbol: "EURUSD",
    from: "EUR",
    to: "USD",
    timeframe: "M15",
    timezone: "Europe/Vilnius",
    RR: 2, // Risk to Reward ratio
    multiplyer: 100000, // for position size calculation

    risk: {
        perTrade: 0.01, // 1%
        moneyAtRisk: 0 // in account currency
    },

    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
    },

    alphaVantage: {
        baseUrl : "https://www.alphavantage.co/query",
        apiKey: process.env.ALPHAVANTAGE_KEY,
        environment: "practice"
    },

    twelveData: {
        baseUrl: "https://api.twelvedata.com",
        apiKey: process.env.TWELVE_DATA_KEY
    },

    oanda: {
        apiKey: process.env.OANDA_API_KEY,
        baseUrl: "https://api-fxpractice.oanda.com/v3",
        environment: "practice" // or "live"
    },

    finnhub: {
        apiKey: process.env.FINNHUB_KEY,
        baseUrl: "https://finnhub.io/api/v1"
    },

    igMarkets: {
        apiKey: process.env.IG_MARKETS_API_KEY,
        baseUrl: "https://demo-api.ig.com/gateway/deal",
        environment: "demo", // or "live"
        accountID: "Z66KDR",
        accountName: "CFD",
        username: "nawfal8815",
        password: "Nawnaw881500?"
    }
};

