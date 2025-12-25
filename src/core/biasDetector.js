function detectAlignment(prev, curr) {
    if (!prev || !curr) return { type: "none", side: null, level: null , target: null};

    const bodyUpper = Math.max(curr.open, curr.close);
    const bodyLower = Math.min(curr.open, curr.close);

    const upperWickMin = bodyUpper;
    const upperWickMax = curr.high;

    const lowerWickMin = curr.low;
    const lowerWickMax = bodyLower;

    const prevHigh = prev.high;
    const prevLow = prev.low;

    const inRange = (val, a, b) => {
        const min = Math.min(a, b);
        const max = Math.max(a, b);
        return val >= min && val <= max;
    };

    let signals = [];

    // ---- WEAK REJECTION (WR) ----
    if (inRange(prevHigh, upperWickMin, upperWickMax)) {
        signals.push({ type: "WR", side: "bearish", level: prevHigh, target: curr.low });
    }

    if (inRange(prevLow, lowerWickMin, lowerWickMax)) {
        signals.push({ type: "WR", side: "bullish", level: prevLow , target: curr.high });
    }

    // ---- BODY CLOSURE (BC) ----
    if (inRange(prevHigh, bodyLower, bodyUpper)) {
        signals.push({ type: "BC", side: "bullish", level: prevHigh, target: curr.high });
    }

    if (inRange(prevLow, bodyLower, bodyUpper)) {
        signals.push({ type: "BC", side: "bearish", level: prevLow , target: curr.low });
    }

    // ---- CONFLICT CHECK ----
    if (signals.length > 1) {
        console.log("⚠️ Conflict detected — multiple signals:", signals);
        return { type: "conflict", side: null, level: null };
    }

    if (signals.length === 0) return { type: "none", side: null, level: null };

    return signals[0];
}


function mapSignal(result) {
    if (!result || result.type === "none" || result.type === "conflict") {
        return { potential: "none" };
    }

    if (result.type === "WR") {
        if (result.side === "bearish") return { potential: "sell" , target: result.target};
        if (result.side === "bullish") return { potential: "buy", target: result.target };
    }

    if (result.type === "BC") {
        if (result.side === "bearish") return { potential: "sell", target: result.target };
        if (result.side === "bullish") return { potential: "buy", target: result.target };
    }

    return { potential: "none" };
}


module.exports = { detectAlignment, mapSignal };

