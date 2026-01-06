import { useEffect, useState } from "react";
import { api } from "../server/frontendApi";
import "../index.css";
import MarketCanvas from "./MarketCanvas"
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { getLatest } from "../../firebase/queries.client";
import UserMenu from "./UserMenu";
// import getData from "../../firebase/queries";



export default function Dashboard() {
    const [data, setData] = useState([]);
    const [dbData, setDbData] = useState([]);
    const [candles, setCandles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userTimezone, setUserTimezone] = useState("");

    useEffect(() => {
        let intervalId;

        const fetchDbData = async () => {
            try {
                const [dailyInfo, news, livePrice] = await Promise.all([
                    getLatest("Daily_Info"),
                    getLatest("News"),
                    getLatest("Live_Price")
                ]);

                setDbData({ dailyInfo, news, livePrice });
            } catch (err) {
                setDbData([]);
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

    const getOffsetDifference = (serverOffset, userOffset) => {
        if (
            typeof serverOffset !== "number" ||
            typeof userOffset !== "number"
        ) {
            return 0;
        }

        // hours to ADD to server time to get user time
        return (serverOffset - userOffset) / 60;
    };


    // Parse a time string like "10:00am" or "4:30pm" into hours and minutes
    function parseTimeString(timeStr) {
        if (!timeStr || timeStr.toLowerCase() === "all day") return null;

        const [time, modifier] = timeStr.match(/(\d{1,2}:\d{2}|\d{1,2})(am|pm)/i).slice(1);
        let [hours, minutes] = time.split(":").map(Number);
        if (!minutes) minutes = 0;

        if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
        if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;

        return { hours, minutes };
    }

    // Convert hours and minutes back to a 12-hour string
    function formatTime(hours, minutes) {
        const modifier = hours >= 12 ? "pm" : "am";
        let adjustedHours = hours % 12;
        if (adjustedHours === 0) adjustedHours = 12;
        return `${adjustedHours}:${minutes.toString().padStart(2, "0")}${modifier}`;
    }

    // Adjust a time string by a number of hours
    function adjustTimeString(timeStr, offsetHours) {
        const parsed = parseTimeString(timeStr);
        if (!parsed) return timeStr; // keep "All Day" as-is

        let newHours = parsed.hours + offsetHours;
        console.log(newHours);

        // Handle wrapping over 24h
        if (newHours >= 24) newHours -= 24;
        if (newHours < 0) newHours += 24;
        return formatTime(newHours, parsed.minutes);
    }



    const account = data.find(d => d.type === "accountDetails")?.account;
    const timezone = data.find(d => d.type === "timezone")?.timezone;
    const dbOffsetMinutes = data.find(d => d.type === "timezone")?.offset;
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
    const userOffsetMinutes = new Date().getTimezoneOffset();
    const timeZoneDifference = getOffsetDifference(dbOffsetMinutes, userOffsetMinutes);
    const adjustedEvents = newsEvents.map((event) => {
        // Only adjust if timezone difference exists
        const newTime = timeZoneDifference !== 0
            ? adjustTimeString(event.time, timeZoneDifference) // subtract because userOffset < serverOffset
            : event.time;

        return {
            ...event,
            time: newTime
        };
    });




    const livePrice = livePriceDoc
        ? {
            price: livePriceDoc.price,
            createdAt: livePriceDoc.createdAt?.toDate()
        }
        : null;

    if (!account && !signal && !news && !candles) {
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
                <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">

                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                            Account
                        </h3>
                        {account?.accountID ? (
                            <div>
                                <p>ID: <span className="font-semibold">{account.accountID}</span></p>
                                <p>Balance: <span className="font-semibold">${account.balance}</span></p>
                                <p>Risk: <span className="font-semibold">${account.moneyAtRisk}</span></p>
                            </div>
                        ) : <p className="font-semibold">No account Data...</p>}
                    </div>

                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                            Daily Bias
                        </h3>
                        {signal?.potential ? (
                            <div className={`text-4xl font-extrabold ${signal.potential.toLowerCase() === "buy"
                                ? "text-teal-400"
                                : signal.potential.toLowerCase() === "sell"
                                    ? "text-rose-400"
                                    : "text-gray-400"
                                }`}>
                                {signal.potential.toUpperCase()}
                            </div>
                        ) : <div className="text-1xl font-extrabold">
                            No signal data...
                        </div>}
                    </div>

                    {percentage ? (
                        <div>
                            <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                                Trade Quality
                            </h3>

                            <div className="flex items-center gap-4">
                                {/* Ring */}
                                <div
                                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                                    style={{
                                        background: percentage >= 60 ?
                                            `conic-gradient(#2dd4bf ${percentage * 3.6}deg, #1f2933 0deg)`
                                            : `conic-gradient(#fb7185 ${percentage * 3.6}deg, #1f2933 0deg)`
                                    }}
                                >
                                    <div className="absolute w-14 h-14 rounded-full bg-[#11161d] flex items-center justify-center">
                                        <span className="text-xl font-extrabold">
                                            {tradeGrade}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-extrabold">
                                No percentage data...
                            </span>
                        </div>
                    )}
                </div>

                {/* NEWS */}
                <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-5">
                    <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">
                        News Decision
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
                                            {n.impact}
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
                    </div>
                </div>

            </div>
        </div>
    );
}
