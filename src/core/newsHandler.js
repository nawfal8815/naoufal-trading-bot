function classifyNews(events) {
    return events.map(event => {
        if (event.impact === "High" && event.time === "All Day") {
            return { type: "SKIP_DAY", event };
        }

        if (event.impact === "High") {
            return { type: "BLOCK_TIME", event };
        }

        if (event.impact === "Medium") {
            return { type: "WARN_TIME", event };
        }

        return { type: "IGNORE", event };
    });
}

function buildTradingRules(classifiedEvents) {
    const rules = {
        skipDay: false,
        blockTimes: [],
        warnTimes: [],
        decision: ''
    };

    for (const item of classifiedEvents) {
        if (item.type === "SKIP_DAY") {
            rules.skipDay = true;
            rules.dicision = "🚫 High impact news all day — trading disabled"
        }

        if (item.type === "BLOCK_TIME") {
            rules.blockTimes.push(item.event.time);
            rules.decision = "🚫 High impact news at: ";
            rules.blockTimes.map(t => rules.decision += t)
        }

        if (item.type === "WARN_TIME") {
            rules.warnTimes.push(item.event.time);
            rules.decision = "⚠ Medium impact news — risky conditions";
        }

        if (rules.decision === '') rules.decision = "✅ No high impact news"
    }

    return rules;
}


async function newsDecision(events) {
    if (events.length === 0) {
        return 0;
    }
    const classified = classifyNews(events);
    return buildTradingRules(classified);
}



module.exports = { newsDecision };