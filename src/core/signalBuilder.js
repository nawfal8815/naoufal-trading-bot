const { getDailySeriesArray } = require("../api/dataFeed");
const { detectAlignment, mapSignal } = require("../core/biasDetector");

async function scanForSignal() {
    const series = await getDailySeriesArray();
    if (!series.length) {
        console.log("No FX data available.");
        return;
    }

    // Loop over consecutive pairs: [i+1, i]
    for (let i = 0; i < series.length - 1; i++) {
        const prev = series[i + 1];
        const curr = series[i];

        const alignment = detectAlignment(prev, curr);
        const signal = mapSignal(alignment);

        if (signal.potential !== "none") {
            console.log("✅ Found valid signal!", alignment.type, alignment.side, "on dates:", prev.date, "&", curr.date);
            return signal;
        }
    }

    console.log("No valid signal found in available data.");
}
module.exports = scanForSignal;