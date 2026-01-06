require("dotenv").config();

module.exports = {
    timezone: "",
    symbol: "EURUSD",
    from: "EUR",
    to: "USD",
    timeframe: "M15",
    RR: 2, // Risk to Reward ratio
    multiplyer: 100000, // for position size calculation
    slMultipler: 10000,
    daylycandles: 20,
    candles15needed: 4 * 24 * 50, //7 days of candles
    port: process.env.PORT,
    url: process.env.URL,
    tradeQuality: 100,
    pips: 0.001,

    risk: {
        perTrade: 0.01, // 1%
        moneyAtRisk: 100 // in account currency
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
        apiKey: process.env.TWELVE_DATA_KEY,
        apiKey2: process.env.TWELVE_DATA_KEY_SECOND,
        apiKey3: process.env.TWELVE_DATA_KEY_THIRD,
        apiKey4: process.env.TWELVE_DATA_KEY_FOURTH,
        apiKey5: process.env.TWELVE_DATA_KEY_FIFTH
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
        accountID: process.env.IG_ACCOUNT_ID,
        accountName: process.env.IG_ACCOUNT_NAME,
        username: process.env.IG_USER_NAME,
        password: process.env.IG_PASSWORD
    },
    newsDataIo: {
        baseUrl: "https://newsdata.io/api/1/",
        apiKey: process.env.NEWS_DATA_IO_API_KEY
    },

    fmp: {
        apiKey: process.env.FINACIAL_MODELING_PREP_KEY,
        baseUrl: "https://financialmodelingprep.com/api/v3"
    }
};

