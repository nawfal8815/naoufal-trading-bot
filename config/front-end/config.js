const config = {
    timezone: "",
    symbol: "EURUSD",
    from: "EUR",
    to: "USD",
    timeframe: "M15",
    daylycandles: 20,
    candles15needed: 4 * 24 * 50, //7 days of candles
    tradeQuality: 100,
    risk: {
        perTrade: 0.01, // 1%
        pips: 0.0016,
        maxTreadesPerDay: 2,
        RR: 2, // Risk to Reward ratio
        multiplyer: 100000, // for position size calculation
        slMultipler: 10000
    }
}

export default config;