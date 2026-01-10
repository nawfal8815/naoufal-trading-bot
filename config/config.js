require("dotenv").config();

module.exports = {
    timezone: "",
    symbol: "EURUSD",
    from: "EUR",
    to: "USD",
    timeframe: "M15",
    daylycandles: 20,
    candles15needed: 4 * 24 * 50, //7 days of candles
    port: process.env.PORT,
    url: process.env.URL,
    tradeQuality: 100,

    risk: {
        perTrade: 0.01, // 1%
        pips: 0.0016,
        maxTreadesPerDay: 2,
        RR: 2, // Risk to Reward ratio
        multiplyer: 100000, // for position size calculation
        slMultipler: 10000
    },

    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN
    },

    alphaVantage: {
        baseUrl: process.env.ALPHAVANTAGE_BASE_URL,
        apiKey: process.env.ALPHAVANTAGE_KEY,
        environment: process.env.ALPHAVANTAGE_ENVIRONMENT
    },

    twelveData: {
        baseUrl: process.env.TWELVE_DATA_BASE_URL,
        apiKey: process.env.TWELVE_DATA_KEY,
        apiKey2: process.env.TWELVE_DATA_KEY_SECOND,
        apiKey3: process.env.TWELVE_DATA_KEY_THIRD,
        apiKey4: process.env.TWELVE_DATA_KEY_FOURTH,
        apiKey5: process.env.TWELVE_DATA_KEY_FIFTH
    },

    oanda: {
        apiKey: process.env.OANDA_API_KEY,
        baseUrl: process.env.OANDA_API_BASE_URL,
        environment: process.env.OANDA_ENVIRONMENT 
    },

    finnhub: {
        apiKey: process.env.FINNHUB_KEY,
        baseUrl: process.env.FINNHUB_URL_KEY
    },

    igMarkets: {
        apiKey: process.env.IG_MARKETS_API_KEY,
        baseUrl: process.env.IG_MARKETS_BASE_URL,
        environment: process.env.IG_MARKETS_ENVIRONMENT,
        accountID: process.env.IG_ACCOUNT_ID,
        accountName: process.env.IG_ACCOUNT_NAME,
        username: process.env.IG_USER_NAME,
        password: process.env.IG_PASSWORD
    },
    newsDataIo: {
        baseUrl: process.env.NEWS_DATA_IO_BASE_URL,
        apiKey: process.env.NEWS_DATA_IO_API_KEY
    },

    fmp: {
        apiKey: process.env.FINACIAL_MODELING_PREP_KEY,
        baseUrl: process.env.FINACIAL_MODELING_PREP_BASE_URL
    }
};

