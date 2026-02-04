const { fetchLatestClosedCandle } =  require('../api/dataFeed');

async function isPriceInFVG(fvg, signal, twelveData) {
    const candle = await fetchLatestClosedCandle(twelveData);
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
