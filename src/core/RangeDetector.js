async function isRanged(fvg, candles, minCandles = 5, tolerance = 0.002) {
    // Filter candles after FVG creation
    const candlesAfterFVG = candles.filter(c => new Date(c.datetime) > new Date(fvg.createdAt));
    
    if (candlesAfterFVG.length < minCandles) return false; // Not enough candles yet

    // Loop through sequences of minCandles length
    for (let i = 0; i <= candlesAfterFVG.length - minCandles; i++) {
        const slice = candlesAfterFVG.slice(i, i + minCandles);
        const highs = slice.map(c => c.high);
        const lows = slice.map(c => c.low);

        const highestHigh = Math.max(...highs);
        const lowestLow = Math.min(...lows);

        // Define max allowed range based on tolerance
        const allowedRange = lowestLow * tolerance;

        if ((highestHigh - lowestLow) <= allowedRange) {
            // Found a ranged segment
            return true;
        }
    }

    // No ranged segment found
    return false;
}



module.exports = { isRanged }; 