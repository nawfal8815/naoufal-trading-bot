const { getDailySeriesArray } = require("../api/dataFeed");
const { detectAlignment, mapSignal } = require("../core/biasDetector");
const { saveLog } = require('../../firebase/queries');
const chalk = require('chalk').default;

async function scanForSignal(twelveData, processId) {
    const series = await getDailySeriesArray(twelveData);
    if (!series.length) {
        console.log(`[${chalk.red(processId)}]: No FX data available.`);
        await saveLog("No FX data available.");
        return;
    }
    const lastCandle = series[0];
    // Loop over consecutive pairs: [i+1, i]
    for (let i = 0; i < series.length - 1; i++) {
        const prev = series[i + 1];
        const curr = series[i];

        const alignment = detectAlignment(prev, curr, lastCandle, processId);
        const signal = mapSignal(alignment);

        if (signal.potential !== "none") {
            console.log(`[${chalk.green(processId)}]: ✅ Found valid signal! ${alignment.type}, ${alignment.side}, on dates: ${prev.date} & ${curr.date}`);
            await saveLog("✅ Found valid signal! " + alignment.type + " " + alignment.side + " on dates: " + prev.date + " & " + curr.date);
            return signal;
        }
    }

    console.log(`[${chalk.red(processId)}]: No valid signal found in available data.`);
    await saveLog("No valid signal found in available data.");
}
module.exports = scanForSignal;