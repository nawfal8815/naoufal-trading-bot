const axios = require("axios");
const config = require("../../config/config");
const { requestWithKeyRotation } = require('../services/twelveDataClient');

// CANDLES UNACCURATE FOR ALPHAVANTAGE FREE TIER
async function getDailySeriesArray() {
    const url = `${config.alphaVantage.baseUrl}?function=FX_DAILY` +
        `&from_symbol=EUR` +
        `&to_symbol=USD` +
        `&apikey=${config.alphaVantage.apiKey}`;
    const res = await axios.get(url);
    const series = res.data["Time Series FX (Daily)"];
    if (!series) return [];

    // Convert object to array sorted descending by date
    const dates = Object.keys(series).sort((a, b) => new Date(b) - new Date(a));
    return dates.map((d) => ({
        date: d,
        open: parseFloat(series[d]["1. open"]),
        high: parseFloat(series[d]["2. high"]),
        low: parseFloat(series[d]["3. low"]),
        close: parseFloat(series[d]["4. close"]),
    }));
}


// TRY LATER TWELVEDATA'S CANDLES
// async function getDailySeriesArray() {
//     const url = `${config.twelveData.baseUrl}/time_series` +
//         `?symbol=EUR/USD` +
//         `&interval=1day` +
//         `&outputsize=${config.daylycandles}` +
//         `&apikey=${config.twelveData.apiKey}`;

//     const res = await axios.get(url);
//     const values = res.data?.values;
//     if (!values) return [];
//     console.log(values);
//     // Twelve Data returns newest first already
//     return values.map(v => ({
//         date: v.datetime,           // YYYY-MM-DD
//         open: parseFloat(v.open),
//         high: parseFloat(v.high),
//         low: parseFloat(v.low),
//         close: parseFloat(v.close),
//     }));
// }



async function get15mSeriesArray() {
    try {
        const res = await requestWithKeyRotation(
            `${config.twelveData.baseUrl}/time_series`,
            {
                symbol: "EUR/USD",
                interval: "15min",
                outputsize: config.candles15needed,
                timezone: config.timezone,
            }
        );

        if (!res.data?.values) {
            console.log("No intraday data returned:", res.data);
            return [];
        }

        return res.data.values
            .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
            .map(c => ({
                datetime: c.datetime,
                open: +c.open,
                high: +c.high,
                low: +c.low,
                close: +c.close,
            }));

    } catch (err) {
        console.error("15m series failed:", err.message);
        return [];
    }
}


async function getLivePrice() {
    try {
        const res = await requestWithKeyRotation(
            `${config.twelveData.baseUrl}/price`,
            { symbol: "EUR/USD" }
        );

        if (!res.data?.price) {
            console.error("Invalid price response:", res.data);
            return null;
        }

        return parseFloat(res.data.price);

    } catch (err) {
        console.error("Live price fetch failed:", err.message);
        return null;
    }
}


async function fetchLatestClosedCandle() {
    try {
        const res = await requestWithKeyRotation(
            `${config.twelveData.baseUrl}/time_series`,
            {
                symbol: "EUR/USD",
                interval: "15min",
                outputsize: 2,
                timezone: config.timezone,
            }
        );

        if (!res.data?.values || res.data.values.length < 2) {
            return null;
        }

        const closed = res.data.values[1];

        return {
            datetime: closed.datetime,
            open: +closed.open,
            high: +closed.high,
            low: +closed.low,
            close: +closed.close,
        };

    } catch (err) {
        console.error("Closed candle fetch failed:", err.message);
        return null;
    }
}



module.exports = { getDailySeriesArray, get15mSeriesArray, getLivePrice, fetchLatestClosedCandle };