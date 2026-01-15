const { is15MinBoundary } = require('./date');
const { fetchLatestClosedCandle, getLivePrice } = require('../api/dataFeed');
const { sleep } = require('./sleep');
const { postData } = require('../server/apiClient');
const { saveLivePrice } = require('../../firebase/queries');

async function updateCandlesData() {
    try {
        const now = new Date();
        if (is15MinBoundary(now) || true) {
            const candle = await fetchLatestClosedCandle();
            if (!candle || !candle.datetime) {
                console.log("⚠️ Error getting the candle data");
                return;
            }
            await postData({
                type: "candles",
                timestamp: new Date().toISOString(),
                candles: [candle]
            });
        }
        await sleep(60 * 1000); //check for close candles every 60 secs
        await updateCandlesData();
    } catch (err) {
        console.log("Last candle error:", err);
    }
}

async function updatePriceData() {
    try {
        const price = await getLivePrice();
        await saveLivePrice({
            price: price
        });
        await sleep(2.5 * 60 * 1000); // every 2.5 minutes
        await updatePriceData();
    } catch (err) {
        console.log("Live price error:", err);
    }
}

module.exports = { updateCandlesData, updatePriceData };