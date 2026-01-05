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
        const fetchData = async () => {
            try {
                const [
                    dailyInfo,
                    news,
                    livePrice,
                    candlesRes,
                    dashboardRes
                ] = await Promise.all([
                    getLatest("Daily_Info"),
                    getLatest("News"),
                    getLatest("Live_Price"),
                    api.get("/api/data/candles"),
                    api.get("/api/data")
                ]);

                setDbData({
                    dailyInfo,
                    news,
                    livePrice
                });
                setCandles(candlesRes.data[0].candles || []);
                setData(dashboardRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        setUserTimezone(
            Intl.DateTimeFormat().resolvedOptions().timeZone
        );
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


    const account = data.find(d => d.type === "accountDetails")?.account;
    const timezone = data.find(d => d.type === "timezone")?.timezone;

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

    const livePrice = livePriceDoc
        ? {
            price: livePriceDoc.price,
            createdAt: livePriceDoc.createdAt?.toDate()
        }
        : null;

    if (!account || !signal || !news) {
        return <div className="text-center mt-10 text-gray-400">No data available</div>;
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
                        Trading BOT Dashboard
                    </h1>

                    <div className="text-xs font-medium text-gray-400 sm:text-right">
                        <div>Server TZ: {timezone}</div>
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
                        <p>ID: <span className="font-semibold">{account.accountID}</span></p>
                        <p>Balance: <span className="font-semibold">${account.balance}</span></p>
                        <p>Risk: <span className="font-semibold">${account.moneyAtRisk}</span></p>
                    </div>

                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                            Daily Bias
                        </h3>
                        <div className={`text-4xl font-extrabold ${signal.potential.toLowerCase() === "buy"
                            ? "text-teal-400"
                            : signal.potential.toLowerCase() === "sell"
                                ? "text-rose-400"
                                : "text-gray-400"
                            }`}>
                            {signal.potential.toUpperCase()}
                        </div>
                    </div>

                    {percentage !== undefined && (
                        <div>
                            <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">
                                Trade Quality
                            </h3>

                            <div className="flex items-center gap-4">
                                {/* Ring */}
                                <div
                                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                                    style={{
                                        background: percentage >= 50 ? 
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

                    <div className="mt-4 space-y-3 text-sm">
                        {newsEvents?.map((n, i) => (
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

                </div>

                {/* CHART + PRICE/FVG */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">

                    {candles && (
                        <MarketCanvas candles={candles} />
                    )}


                    <div className="space-y-6">
                        {livePrice && (
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
                        )}

                        {fvg && (
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
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
