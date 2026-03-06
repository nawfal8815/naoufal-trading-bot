module.exports = {
    timezone: "",
    symbol: "EURUSD",
    from: "EUR",
    to: "USD",
    timeframe: "M15",
    daylycandles: 20,
    candles15needed: 4 * 24 * 50, //7 days of candles
    candlesDailyNeeded: 30,
    port: process.env.PORT,
    url: process.env.URL,
    tradeQuality: 0,
    botApiKey: process.env.BOT_API_KEY,
    pipsFixer: 5,
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
        apiKey5: process.env.TWELVE_DATA_KEY_FIFTH,
        apiKey6: process.env.TWELVE_DATA_KEY_SIXTH,
        apiKey7: process.env.TWELVE_DATA_KEY_SEVENTH,
        apiKey8: process.env.TWELVE_DATA_KEY_EIGHTH,
        apiKey9: process.env.TWELVE_DATA_KEY_NINTH,
        apiKey10: process.env.TWELVE_DATA_KEY_TENTH,
        apiKey11: process.env.TWELVE_DATA_KEY_ELEVENTH,
        apiKey12: process.env.TWELVE_DATA_KEY_TWELFTH,
        apiKey13: process.env.TWELVE_DATA_KEY_THIRTEENTH,
        apiKey14: process.env.TWELVE_DATA_KEY_FOURTEENTH,
        apiKey15: process.env.TWELVE_DATA_KEY_FIFTEENTH
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

