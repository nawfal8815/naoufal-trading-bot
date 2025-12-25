const axios = require("axios");
const config = require("../../config/config");

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


async function get15mSeriesArray() {
    try {
        const url = `${config.twelveData.baseUrl}/time_series`;
        const params = {
            symbol: "EUR/USD",
            interval: "15min",
            outputsize: 5000,
            apikey: config.twelveData.apiKey,
            timezone: config.timezone
        };

        const res = await axios.get(url, { params });

        if (!res.data || !res.data.values) {
            console.log("No intraday data returned:", res.data);
            return [];
        }

        // sort newest → oldest for FVG detection
        const sorted = res.data.values.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

        return sorted.map(c => ({
            datetime: c.datetime,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close)
        }));

    } catch (err) {
        console.error("Request failed:", err.message);
        return [];
    }
}

async function getLivePrice() {
    try {
        const res = await axios.get(`${config.twelveData.baseUrl}/price`, {
            params: {
                symbol: "EUR/USD",
                apikey: config.twelveData.apiKey
            }
        });

        if (!res.data || !res.data.price) {
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
    const res = await axios.get(`${config.twelveData.baseUrl}/time_series`, {
        params: {
            symbol: "EUR/USD",
            interval: "15min",
            outputsize: 2, // we only need last 2 candles
            timezone: config.timezone,
            apikey: config.twelveData.apiKey
        }
    });

    if (!res.data || !res.data.values || res.data.values.length < 2) {
        return null;
    }

    // index 0 = current forming candle
    // index 1 = last CLOSED candle
    const closed = res.data.values[1];

    return {
        datetime: closed.datetime,
        open: parseFloat(closed.open),
        high: parseFloat(closed.high),
        low: parseFloat(closed.low),
        close: parseFloat(closed.close),
    };
}


module.exports = { getDailySeriesArray, get15mSeriesArray, getLivePrice, fetchLatestClosedCandle };