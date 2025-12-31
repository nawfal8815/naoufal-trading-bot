const { postData } = require('../server/apiClient');
const { fetchLatestClosedCandle } =  require('../api/dataFeed');

async function isPriceInFVG(fvg, signal) {
    const candle = await fetchLatestClosedCandle();
    await postData({
        type: "livePrice",
        timestamp: new Date().toISOString(),
        price: candle.close
    });
    // console.log("Current Live EUR/USD Price:", price);
    if (priceInFVG(candle, fvg, signal)) {
        return { candle: candle, inFVG: true };
    } else {
        return { candle: candle, inFVG: false };
    }
}

function priceInFVG(candle, fvg, signal) {
    if (signal.potential === "buy") {
        return candle.low >= fvg.gapLow && candle.low <= fvg.gapHigh;
    }
    if (signal.potential === "sell") {
        return candle.high >= fvg.gapLow && candle.high <= fvg.gapHigh;
    }
}




module.exports = { isPriceInFVG };
