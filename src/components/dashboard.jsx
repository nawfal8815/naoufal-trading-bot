import { useEffect, useState } from "react";
import { api } from "../server/frontendApi";
import "../index.css";

export default function Dashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userTimezone, setUserTimezone] = useState("");

    useEffect(() => {
        api.get("/api/data")
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimezone(tz);
    }, []);

    if (loading) {
        return <div className="text-center mt-10 text-white">Loading...</div>;
    }

    const impactColor = (impact) => {
        switch (impact) {
            case "High":
                return "text-red-400";
            case "Medium":
                return "text-orange-400";
            case "Low":
                return "text-yellow-400";
            default:
                return "text-gray-400";
        }
    };

    const account = data.find(d => d.type === "accountDetails")?.account;
    const signal = data.find(d => d.type === "signal")?.signal;
    const news = data.find(d => d.type === "news")?.news;
    const timezone = data.find(d => d.type === "timezone")?.timezone;
    const fvg = data.find(d => d.type === "fvg")?.fvg;
    const newsEvents = data.find(d => d.type === "events")?.events;

    const livePrices = data.filter(d => d.type === "livePrice");

    const latestLivePrice =
        livePrices.length > 0
            ? livePrices.sort(
                (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            )[0]
            : null;



    if (!account || !signal || !news) {
        return <div className="text-center mt-10 text-white">No data available</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
            <div className="mx-auto w-[100%] lg:w-full lg:max-w-[60%] p-4 sm:p-6 space-y-6">
                <div className="flex justify-between">
                    <h1 className="text-2xl font-bold">Trading BOT Dashboard</h1>
                    <div className="text-right text-sm text-gray-400">
                        <div>Server's timezone: {timezone}</div>
                        <div>Your timezone: {userTimezone}</div>
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl">
                    <p>ID: {account.accountID}</p>
                    <p>Balance: ${account.balance}</p>
                    <p>Money at Risk: ${account.moneyAtRisk}</p>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl">
                    <h2 className="font-semibold">Daily Signal</h2>
                    <div className={`p-3 mt-2 rounded-lg text-center ${signal.potential === "buy" ? "bg-green-600" :
                        signal.potential === "sell" ? "bg-red-600" : "bg-gray-600"
                        }`}>
                        {signal.potential.toUpperCase()}
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl">
                    <h2 className="font-semibold">News</h2>

                    {news.skipDay ? (
                        <p className="text-red-500 font-semibold">
                            🚫 High impact news all day — skipping trading for today
                        </p>
                    ) : news.blockTimes.length > 0 ? (
                        <div>
                            <p className="text-red-400 font-semibold mb-1">
                                🚫 High impact news at:
                            </p>
                            <ul>
                                {news.blockTimes.map((t, i) => (
                                    <li key={i} className="text-red-400">
                                        ⚠ {t.time ?? t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : news.warnTimes.length > 0 ? (
                        <div>
                            <p className="text-yellow-400 font-semibold mb-1">
                                ⚠ Medium impact news — trades will be risky
                            </p>
                            <ul>
                                {news.warnTimes.map((t, i) => (
                                    <li key={i} className="text-yellow-400">
                                        ⚠ {t.time ?? t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-green-400">
                            ✅ No high impact news
                        </p>
                    )}
                </div>


                <div className="bg-gray-800 p-4 rounded-xl">
                    <h2 className="font-semibold mb-3">Economic Calendar</h2>

                    {newsEvents && newsEvents.length > 0 ? (
                        <div className="space-y-2">
                            {newsEvents.map((n, i) => (
                                <div
                                    key={i}
                                    className="grid grid-cols-1 sm:grid-cols-[80px_60px_70px_1fr] gap-y-1 items-center text-sm border-b border-gray-700 pb-2"

                                >
                                    {/* Time */}
                                    <div className="sm:hidden text-xs text-gray-500">Time</div>
                                    <div className="text-gray-400">
                                        {n.time}
                                    </div>

                                    {/* Currency */}
                                    <div className="sm:hidden text-xs text-gray-500">Currency</div>
                                    <div className="font-semibold text-blue-400">
                                        {n.currency}
                                    </div>

                                    {/* Impact */}
                                    <div className="sm:hidden text-xs text-gray-500">Impact</div>
                                    <div className={`font-semibold ${impactColor(n.impact)}`}>
                                        {n.impact}
                                    </div>

                                    {/* Event */}
                                    <div className="sm:hidden text-xs text-gray-500">Event</div>
                                    <div className="text-gray-200">
                                        {n.event}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-green-400">No scheduled events</p>
                    )}
                </div>


                {fvg && (
                    <div className="bg-gray-800 p-4 rounded-xl">
                        <h2 className="font-semibold">Fair Value Gap (FVG)</h2>

                        <div
                            className={`p-3 mt-2 rounded-lg text-center ${fvg.type === "bullish"
                                ? "bg-green-700"
                                : fvg.type === "bearish"
                                    ? "bg-red-700"
                                    : "bg-gray-600"
                                }`}
                        >
                            {fvg.type.toUpperCase()}
                        </div>

                        <div className="mt-3 text-sm text-gray-300 space-y-1">
                            <p>Creation time: {fvg.createdAt}</p>
                            <p>Upper: {fvg.gapHigh}</p>
                            <p>Lower: {fvg.gapLow}</p>
                            <p>Middle: {fvg.gapMid}</p>
                            <p>Fully virgin: {fvg.fullVirgin ? "Yes" : "No"}</p>
                        </div>
                    </div>
                )}

                {latestLivePrice && (
                    <div className="bg-gray-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold">Live Price</h2>
                            <p className="text-xs text-gray-400">
                                Last price check: {new Date(latestLivePrice.timestamp).toLocaleTimeString()}
                            </p>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">
                                {latestLivePrice.price}
                            </div>
                            <div className="text-xs text-gray-400">Last market price</div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
