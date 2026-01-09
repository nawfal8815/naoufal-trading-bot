import { useEffect, useState, useRef } from "react";
import { api } from "../server/frontendApi";
import "../index.css";
import MarketCanvas from "./MarketCanvas"
import { auth } from "../../firebase/firebase";
import { getLatest, getUserIG, getLogs } from "../../firebase/queries.client";
import UserMenu from "./UserMenu";
import config from "../../config/front-end/config";



export default function Dashboard() {
    const [data, setData] = useState([]);
    const [dbData, setDbData] = useState([]);
    const [candles, setCandles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userTimezone, setUserTimezone] = useState("");
    const [igAccount, setIgAccount] = useState(null);
    const [moneyAtRisk, setMoneyAtRisk] = useState(0);
    const logsEndRef = useRef(null);

    useEffect(() => {
        let intervalId;

        const fetchDbData = async () => {
            try {
                const [dailyInfo, news, livePrice, logs, userInfo] = await Promise.all([
                    getLatest("Daily_Info"),
                    getLatest("News"),
                    getLatest("Live_Price"),
                    getLogs("Logs"),
                    getUserIG(auth.currentUser.uid)
                ]);

                setDbData({ dailyInfo, news, livePrice, logs });
                setIgAccount(userInfo.igAccount);
                setMoneyAtRisk(userInfo.igAccount.balance * config.risk.perTrade);
            } catch (err) {
                setDbData([]);
                setIgAccount(null);
                console.error("DB fetch failed:", err);
            }
        };

        const fetchApiData = async () => {
            try {
                const [candlesRes, dashboardRes] = await Promise.all([
                    api.get("/api/data/candles"),
                    api.get("/api/data")
                ]);

                setCandles(candlesRes?.data[0]?.candles || []);
                setData(dashboardRes?.data || null);
            } catch (err) {
                setCandles([]);
                setData([]);
                console.error("API fetch failed:", err);
            }
        };

        const init = async () => {
            try {
                await Promise.allSettled([
                    fetchDbData(),
                    fetchApiData()
                ]);
            } finally {
                setLoading(false);
            }
        };

        init();

        intervalId = setInterval(init, 60 * 1000);

        setUserTimezone(
            Intl.DateTimeFormat().resolvedOptions().timeZone
        );

        return () => clearInterval(intervalId);
    }, []);

    const logsSnap = dbData?.logs?.snap ?? [];

    const logs = logsSnap.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            log: data.Log,
            createdAt: data.createdAt?.toDate?.() ?? null
        };
    });

    useEffect(() => {
        if (!logs || logs.length === 0) return;

        logsEndRef.current?.scrollIntoView({
            behavior: "auto" // change to "smooth" if you want animation
        });
    }, [logs]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
                <div className="text-gray-300 text-lg font-semibold tracking-wide">
                    Loading...
                </div>
            </div>
        );
    }

    const impactColor = (impact) => {
        switch (impact) {
            case "High": return "text-rose-400";
            case "Medium": return "text-amber-400";
            case "Low": return "text-teal-400";
            default: return "text-gray-400";
        }
    };

    const newsDecisionStyle = (decision) => {
        if (!decision) return "text-gray-400";

        if (decision.includes("High impact") && decision.includes("disabled")) {
            return "text-rose-400";
        }

        if (decision.includes("High impact")) {
            return "text-rose-400";
        }

        if (decision.includes("Medium impact")) {
            return "text-amber-400";
        }

        if (decision.includes("No high impact")) {
            return "text-teal-400";
        }

        return "text-gray-400";
    };
    function parseTimeString(timeStr) {
        if (!timeStr || timeStr.toLowerCase() === "all day") return null;

        const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?(am|pm)/i);
        if (!match) return null;

        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const modifier = match[3].toLowerCase();

        if (modifier === "pm" && hours < 12) hours += 12;
        if (modifier === "am" && hours === 12) hours = 0;

        return { hours, minutes };
    }

    // Helper: convert {hours, minutes} back to 12-hour string
    function formatTime({ hours, minutes }) {
        const modifier = hours >= 12 ? "pm" : "am";
        let displayHours = hours % 12;
        if (displayHours === 0) displayHours = 12;
        return `${displayHours}:${minutes.toString().padStart(2, "0")}${modifier}`;
    }

    // Main function: adjust all events by a timezone offset in hours
    function adjustEventsTime(events, offsetHours) {
        return events.map(event => {
            if (!event.time || event.time.toLowerCase() === "all day") {
                return { ...event }; // leave "All Day" as-is
            }

            const parsed = parseTimeString(event.time);
            if (!parsed) return { ...event };

            let newHours = parsed.hours + offsetHours;

            // wrap over 24 hours
            if (newHours >= 24) newHours -= 24;
            if (newHours < 0) newHours += 24;

            return {
                ...event,
                time: formatTime({ hours: newHours, minutes: parsed.minutes })
            };
        });
    }

    function getTimeDifference(tz1, tz2) {
        const now = new Date();

        // Get offsets in minutes
        const offset1 = -now.toLocaleString("en-US", { timeZone: tz1, hour12: false, hour: "2-digit", minute: "2-digit" })
            .split(":").reduce((acc, val, idx) => acc + (idx === 0 ? parseInt(val) * 60 : parseInt(val)), 0);

        const offset2 = -now.toLocaleString("en-US", { timeZone: tz2, hour12: false, hour: "2-digit", minute: "2-digit" })
            .split(":").reduce((acc, val, idx) => acc + (idx === 0 ? parseInt(val) * 60 : parseInt(val)), 0);

        // Calculate difference in hours
        const diffHours = (offset2 - offset1) / 60;
        return diffHours;
    }

    const fvgStatus = data.find(d => d.type === "fvgStatus")?.status;
    const timezone = data.find(d => d.type === "timezone")?.timezone;
    const offsetHours = getTimeDifference(userTimezone, timezone);

    const dailyInfo = dbData?.dailyInfo;
    const newsDoc = dbData?.news;
    const livePriceDoc = dbData?.livePrice;
    const signal = dailyInfo?.bias
        ? { potential: dailyInfo.bias }
        : null;

    const percentage = dailyInfo?.tradeQuality ?? null;
    const tradeGrade =
        percentage >= 80 ? "A+" :
            percentage >= 70 ? "A" :
                percentage >= 60 ? "B" :
                    percentage >= 50 ? "C" : "D";

    const fvg = dailyInfo?.fvg ?? null;

    const news = newsDoc?.decision ?? null;

    const newsEvents = newsDoc?.events ?? [];
    const adjustedEvents = adjustEventsTime(newsEvents, offsetHours);



    const livePrice = livePriceDoc
        ? {
            price: livePriceDoc.price,
            createdAt: livePriceDoc.createdAt?.toDate()
        }
        : null;

    if (!signal && !news && !candles) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0f14]">
                <div className="text-gray-300 text-lg font-semibold tracking-wide">
                    No data available...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0f14] text-gray-100 p-4 sm:p-6">
            <div className="mx-auto w-full lg:max-w-[60%] space-y-6">

                {/* HEADER */}
                <div className="
                    grid
                    grid-cols-[1fr_auto]
                    gap-y-3
                    border-b border-[#1f2933] pb-4
                    sm:grid-cols-[1fr_auto_auto]
                    sm:items-start
                ">
                    <h1 className="text-2xl font-extrabold tracking-wide">
                        Dashboard
                    </h1>

                    <div className="text-xs font-medium text-gray-400 sm:text-right">
                        <div>Server TZ: {timezone ? timezone : "No timezone data..."}</div>
                        <div>Your TZ: {userTimezone}</div>
                    </div>

                    <div className="justify-self-end ml-20">
                        <UserMenu />
                    </div>

                </div>

                {/* ACCOUNT / BIAS / QUALITY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* IG ACCOUNT CARD */}
                    <div className="bg-[#0f141b] border border-[#1f2933] rounded-xl p-5 shadow-sm">
                        <div className="space-y-5">
                            <h3 className="text-xs uppercase tracking-widest text-gray-400">
                                IG Markets Account
                            </h3>
                            {/* BALANCE */}
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Available Balance</p>
                                <p className="text-3xl font-extrabold text-teal-400 tracking-wide">
                                    ${igAccount.balance}
                                </p>
                            </div>

                            {/* DETAILS */}
                            <div className="grid grid-cols-2 gap-y-3 text-sm">
                                <div>
                                    <p className="text-gray-400">Account ID</p>
                                    <p className="font-semibold text-gray-200">
                                        {igAccount.accountID}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-gray-400">Risk / Trade</p>
                                    <p className="font-semibold text-amber-400">
                                        ${moneyAtRisk}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* DAILY BIAS CARD */}
                    <div className="bg-[#0f141b] border border-[#1f2933] rounded-xl p-5 shadow-sm flex flex-col justify-center">
                        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                            Daily Bias
                        </h3>

                        {signal?.potential ? (
                            <div
                                className={`text-center text-5xl font-extrabold tracking-wide ${signal.potential.toLowerCase() === "buy"
                                    ? "text-teal-400"
                                    : signal.potential.toLowerCase() === "sell"
                                        ? "text-rose-400"
                                        : "text-gray-400"
                                    }`}
                            >
                                {signal.potential.toUpperCase()}
                                <p className="text-xs text-gray-500 tracking-wide mt-5">
                                    Higher timeframe direction
                                </p>
                            </div>

                        ) : (
                            <div className="text-center text-gray-400 font-semibold">
                                No bias data
                            </div>
                        )}
                    </div>

                    {/* TRADE QUALITY CARD */}
                    <div className="bg-[#0f141b] border border-[#1f2933] rounded-xl p-5 shadow-sm">
                        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">
                            Trade Quality
                        </h3>

                        {percentage ? (
                            <div className="flex items-start gap-5">

                                {/* RING + STATUS COLUMN */}
                                <div className="flex flex-col items-center gap-3">

                                    {/* RING CONTAINER */}
                                    <div className="flex items-center justify-center w-24 h-24 rounded-full bg-[#0b1016] border border-[#1f2933] shadow-inner">
                                        <div
                                            className="relative w-20 h-20 rounded-full flex items-center justify-center"
                                            style={{
                                                background:
                                                    percentage >= 60
                                                        ? `conic-gradient(#2dd4bf ${percentage * 3.6}deg, #1f2933 0deg)`
                                                        : `conic-gradient(#fb7185 ${percentage * 3.6}deg, #1f2933 0deg)`
                                            }}
                                        >
                                            <div className="absolute w-14 h-14 rounded-full bg-[#0f141b] flex items-center justify-center shadow-md">
                                                <span className="text-xl font-extrabold text-white">
                                                    {tradeGrade}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* FVG STATUS UNDER RING */}
                                    {fvgStatus && (
                                        <div className="text-center">
                                            <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                                                FVG Status
                                            </p>
                                            <p className="text-sm font-semibold text-teal-400 leading-snug">
                                                {fvgStatus}
                                            </p>
                                        </div>
                                    )}

                                </div>


                            </div>
                        ) : (
                            <p className="text-gray-400 font-semibold">
                                No trade quality data
                            </p>
                        )}

                    </div>

                </div>


                {/* NEWS */}
                <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-5">
                    <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">
                        News Decision
                        <span className="block mt-1 text-[15px] text-teal-500 italic">
                            (The time could be scaled{' '}
                            <a
                                href="https://www.forexfactory.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-gray-400 hover:text-gray-300 transition-colors"
                            >
                                forexfactory.com
                            </a>{' '}
                            for exact time)
                        </span>
                    </h2>

                    {news ? (
                        <p className={`font-semibold ${newsDecisionStyle(news)}`}>
                            {news}
                        </p>
                    ) : (
                        <p className="text-gray-400 font-semibold">
                            No news data available
                        </p>
                    )}

                    {newsEvents.length !== 0 && (
                        <div className="mt-4 space-y-3 text-sm">
                            {adjustedEvents?.map((n, i) => (
                                <div
                                    key={i}
                                    className="
                                w-full
                                border-b border-[#1f2933] pb-3
                                flex flex-col gap-1
                                sm:grid sm:grid-cols-[90px_70px_90px_1fr]
                                sm:gap-4 sm:items-center
                            "
                                >
                                    {/* TIME */}
                                    <div className="flex sm:block">
                                        <span className="sm:hidden text-gray-500 mr-1">Time:</span>
                                        <span className="text-gray-400">{n.time}</span>
                                    </div>

                                    {/* CURRENCY */}
                                    <div className="flex sm:block">
                                        <span className="sm:hidden text-gray-500 mr-1">Currency:</span>
                                        <span className="text-blue-400 font-semibold">{n.currency}</span>
                                    </div>

                                    {/* IMPACT */}
                                    <div className="flex sm:block">
                                        <span className="sm:hidden text-gray-500 mr-1">Impact:</span>
                                        <span className={`${impactColor(n.impact)} font-semibold`}>
                                            {n.impact === "N/A" ? "Non-Economic" : n.impact}
                                        </span>
                                    </div>

                                    {/* EVENT */}
                                    <div className="flex sm:block text-gray-200">
                                        <span className="sm:hidden text-gray-500 mr-1">Event:</span>
                                        <span>{n.event}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* CHART + PRICE/FVG */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">

                    {candles && (
                        <MarketCanvas candles={candles} />
                    )}


                    <div className="space-y-6">
                        {livePrice ? (
                            <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-4">
                                <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                                    Live Price
                                </h2>
                                <div className="text-3xl font-extrabold text-teal-400">
                                    {livePrice.price}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Last update:{" "}
                                    {livePrice.createdAt
                                        ? livePrice.createdAt.toLocaleString(undefined, {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit"
                                        })
                                        : "—"}
                                </div>
                            </div>
                        ) : <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-4">
                            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                                No live price data...
                            </h2>
                        </div>}

                        {fvg ? (
                            <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-4">
                                <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                                    Fair Value Gap
                                </h2>
                                <div className={`text-2xl font-extrabold ${fvg.type === "bullish" ? "text-teal-400" : "text-rose-400"
                                    }`}>
                                    {fvg.type.toUpperCase()}
                                </div>
                                <p className="text-sm text-gray-300">Created at: {fvg.createdAt}</p>
                                <p className="text-sm text-gray-300">High: {fvg.gapHigh}</p>
                                <p className="text-sm text-gray-300">Low: {fvg.gapLow}</p>
                                {!fvg.fullVirgin ? <p className="text-sm text-gray-300">Mid: {fvg.gapMid}</p> : null}
                                <p className="text-xs text-gray-400">
                                    Virgin: {fvg.fullVirgin ? "Yes" : "No"}
                                </p>
                            </div>
                        ) : <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-4">
                            <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                                No Fair Value Gap data...
                            </h2>
                        </div>}

                        {logs && logs.length > 0 ? (
                            <div className="
                                    bg-gradient-to-b from-[#11161d] to-[#0d1218]
                                    border border-[#1f2933]
                                    rounded-xl
                                    p-4
                                    shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_30px_rgba(0,0,0,0.4)]
                                ">
                                <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                                    Logs
                                </h2>

                                {/* SCROLL CONTAINER */}
                                <div className="
                                        h-56
                                        w-full
                                        overflow-y-auto
                                        rounded-lg
                                        bg-[#0b0f14]
                                        border border-[#1f2933]
                                        p-3
                                        space-y-3
                                        text-sm
                                        font-mono
                                    ">

                                    {logs.map((entry, i) => {
                                        const date = entry.createdAt instanceof Date
                                            ? entry.createdAt
                                            : entry.createdAt.toDate();

                                        return (
                                            <div
                                                key={i}
                                                className="border-b border-[#1f2933] pb-2 last:border-none"
                                            >
                                                <div className="text-[11px] text-gray-500 mb-1">
                                                    {entry.createdAt
                                                        ? entry.createdAt.toLocaleString(undefined, {
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "2-digit",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            second: "2-digit"
                                                        })
                                                        : "—"}
                                                    <div className="text-gray-200 leading-relaxed">
                                                        {entry.log}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        ) : (
                            <div className="
                                    bg-[#11161d]
                                    border border-[#1f2933]
                                    rounded-xl
                                    p-4
                                ">
                                <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                                    Logs
                                </h2>
                                <p className="text-sm text-gray-500 italic">
                                    No logs data available…
                                </p>
                            </div>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}

