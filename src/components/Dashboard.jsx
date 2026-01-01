import { useEffect, useState } from "react";
import { api } from "../server/frontendApi";
import "../index.css";
import MarketCanvas from "./MarketCanvas"

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [candles, setCandles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userTimezone, setUserTimezone] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardRes, candlesRes] = await Promise.all([
                    api.get("/api/data"),
                    api.get("/api/data/candles")
                ]);

                setData(dashboardRes.data);
                setCandles(candlesRes.data[0].candles || []);
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
        return <div className="text-center mt-10 text-gray-300">Loading...</div>;
    }

    const impactColor = (impact) => {
        switch (impact) {
            case "High": return "text-red-400";
            case "Medium": return "text-yellow-400";
            case "Low": return "text-green-400";
            default: return "text-gray-400";
        }
    };

    const account = data.find(d => d.type === "accountDetails")?.account;
    const signal = data.find(d => d.type === "signal")?.signal;
    const news = data.find(d => d.type === "news")?.news;
    const timezone = data.find(d => d.type === "timezone")?.timezone;
    const fvg = data.find(d => d.type === "fvg")?.fvg;
    const newsEvents = data.find(d => d.type === "events")?.events;
    const percentage = data.find(d => d.type === "percentage")?.percentage;
    const livePrice = data.find(d => d.type === "livePrice");

    if (!account || !signal || !news) {
        return <div className="text-center mt-10 text-gray-400">No data available</div>;
    }

    return (
        <div className="min-h-screen bg-[#0b0f14] text-gray-100 p-4 sm:p-6">
            <div className="mx-auto w-full lg:max-w-[60%] space-y-6">

                {/* HEADER */}
                <div className="flex justify-between items-start border-b border-[#1f2933] pb-4">
                    <h1 className="text-2xl font-extrabold tracking-wide">
                        Trading BOT Dashboard
                    </h1>
                    <div className="text-right text-xs font-medium text-gray-400">
                        <div>Server TZ: {timezone}</div>
                        <div>Your TZ: {userTimezone}</div>
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
                        <div className={`text-4xl font-extrabold ${signal.potential === "buy"
                            ? "text-green-400"
                            : signal.potential === "sell"
                                ? "text-red-400"
                                : "text-gray-400"
                            }`}>
                            {signal.potential.toUpperCase()}
                        </div>
                    </div>

                    {percentage !== undefined && (
                        <div>
                            <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                                Trade Quality
                            </h3>
                            <div className="text-4xl font-extrabold text-green-400">
                                {percentage}%
                            </div>
                            <div className="w-full bg-[#1f2933] rounded-full h-2 mt-3">
                                <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* NEWS */}
                <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-5">
                    <h2 className="text-sm uppercase tracking-wider text-gray-400 mb-3">
                        News Decision
                    </h2>

                    {news.skipDay ? (
                        <p className="text-red-500 font-semibold">
                            🚫 High impact news all day — trading disabled
                        </p>
                    ) : news.blockTimes.length > 0 ? (
                        <div>
                            <p className="text-red-400 font-semibold mb-1">
                                🚫 High impact news at:
                            </p>
                            <ul className="text-sm text-red-400">
                                {news.blockTimes.map((t, i) => (
                                    <li key={i}>• {t}</li>
                                ))}
                            </ul>
                        </div>
                    ) : news.warnTimes.length > 0 ? (
                        <p className="text-yellow-400 font-semibold">
                            ⚠ Medium impact news — risky conditions
                        </p>
                    ) : (
                        <p className="text-green-400 font-semibold">
                            ✅ No high impact news
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
                                <div className="text-3xl font-extrabold text-green-400">
                                    {livePrice.price}
                                </div>
                                <p className="text-xs text-gray-400">
                                    Last update: {new Date(livePrice.timestamp).toLocaleTimeString()}
                                </p>
                            </div>
                        )}

                        {fvg && (
                            <div className="bg-[#11161d] border border-[#1f2933] rounded-xl p-4">
                                <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-2">
                                    Fair Value Gap
                                </h2>
                                <div className={`text-2xl font-extrabold ${fvg.type === "bullish" ? "text-green-400" : "text-red-400"
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
