import { useEffect, useState, useRef } from "react";
import { api } from "../server/frontendApi";
import "../index.css";
import MarketCanvas from "./MarketCanvas"
import { auth } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth"; // Add this import
import { getLatest, getUserIG, getLogs } from "../../firebase/queries.client";
import UserMenu from "./UserMenu";
import { useNavigate } from "react-router-dom";


export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null); // Declare user state
    const [authLoading, setAuthLoading] = useState(true); // Declare authLoading state
    const [data, setData] = useState([]);
    const [dbData, setDbData] = useState([]);
    const [candles, setCandles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userTimezone, setUserTimezone] = useState("");
    const [igAccount, setIgAccount] = useState(null);
    const [moneyAtRisk, setMoneyAtRisk] = useState(0);
    const logsEndRef = useRef(null);
    const prevLogsLength = useRef(0);
    const hasMountedRef = useRef(false);
    const [showGuide, setShowGuide] = useState(false);
    const [idToken, setIdToken] = useState(null);
    const RISK_PER_TRADE = 0.01; // 1% risk per trade

    const fetchApiData = async (currentUser) => { // Pass currentUser as an argument
        if (!currentUser) return; // Don't fetch if no user is logged in

        try {
            const idToken = await currentUser.getIdToken(); // Get Firebase ID Token
            const headers = { Authorization: `Bearer ${idToken}` };

            const [candlesRes, dashboardRes] = await Promise.all([
                api.get("/api/data/candles", { headers }),
                api.get("/api/data", { headers })
            ]);

            setCandles(candlesRes?.data || []);
            setData(dashboardRes?.data || null);
        } catch (err) {
            setCandles([]);
            setData([]);
            console.error("API fetch failed:", err);
        }
    };

    const fetchDbData = async () => {
        try {
            const [dailyInfo, news, livePrice, logs] = await Promise.all([
                getLatest("Daily_Info"),
                getLatest("News"),
                getLatest("Live_Price"),
                getLogs("Logs")
            ]);

            setDbData({ dailyInfo, news, livePrice, logs });
        } catch (err) {
            setDbData([]);
            console.error("DB fetch failed:", err);
        }
    };

    const fetchIGData = async () => {
        try {
            const userInfo = await api.get(`/api/get-account-status/${auth.currentUser.uid}`, {
                headers: {
                    Authorization: `Bearer ${idToken}`
                }
            });
            setIgAccount(userInfo?.data.igAccount || null);
            setMoneyAtRisk(userInfo?.data.igAccount?.balance * RISK_PER_TRADE || 0);
        } catch (err) {
            setIgAccount(null);
            setMoneyAtRisk(0);
            console.error("IG fetch failed:", err);
        }
    };

    const init = async () => {
        if (!user) { // Ensure user is loaded before making authenticated calls
            setLoading(false);
            return;
        }
        try {
            await Promise.allSettled([
                fetchDbData(),
                fetchApiData(user), // Pass the user object here
                fetchIGData()
            ]);
        } finally {
            setLoading(false);
        }
    };

    // AUTH LISTENER for user and authLoading states
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const token = await firebaseUser.getIdToken();
                setIdToken(token);
            } else setIdToken(null);
            setAuthLoading(false);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        let intervalId;

        // Only proceed if authentication state has been determined
        if (authLoading) {
            return; // Still loading auth state
        }

        // If auth state is known, but no user, stop loading and return
        if (!user) {
            setLoading(false);
            return;
        }

        // If auth state is known and user is present, initialize
        init(); // init itself handles passing user to fetchApiData

        intervalId = setInterval(() => init(), 5 * 60 * 1000); // init already passes user to fetchApiData

        return () => clearInterval(intervalId);
    }, [authLoading, user]); // Depend on authLoading and user

    useEffect(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimezone(tz);
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

        // ⛔ Skip first render
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            prevLogsLength.current = logs.length;
            return;
        }

        // ✅ Scroll ONLY when new logs arrive after mount
        if (logs.length > prevLogsLength.current) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }

        prevLogsLength.current = logs.length;
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

    const fvgStatus = data.find(d => d.type === "fvgStatus")?.status;
    const timezone = data.find(d => d.type === "timezone")?.timezone;

    const dailyInfo = dbData?.dailyInfo;
    const newsDoc = dbData?.news;
    const livePriceDoc = dbData?.livePrice;
    const signal = dailyInfo?.bias
        ? { potential: dailyInfo.bias }
        : null;
    const biasTime = dailyInfo?.createdAt?.toDate()?.toLocaleString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }) ?? null;

    const percentage = dailyInfo?.tradeQuality ?? null;
    const tradeGrade =
        percentage >= 90 ? "S" :
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

    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 0 || day === 6;

    if (!signal && !fvg && !candles) {
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

                {isWeekend && (
                    <div className="
                            flex
                            justify-center
                            items-center
                            text-center
                            border-b
                            border-[#1f2933]
                            pb-4
                        ">
                        <h1 className="
                                text-2xl
                                font-extrabold
                                tracking-wide
                                text-rose-400
                            ">
                            No trading in the weekend, this data is for the next Monday!
                        </h1>
                    </div>
                )}



                {/* ACCOUNT / BIAS / QUALITY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* IG ACCOUNT CARD */}

                    <div className="bg-[#0f141b] border border-[#1f2933] rounded-xl p-5 shadow-sm">
                        <div className="space-y-5">
                            <h3 className="text-xs uppercase tracking-widest text-gray-400">
                                IG Markets Account
                            </h3>
                            {/* BALANCE */}
                            {igAccount !== null ?
                                <>
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
                                </>
                                : <>
                                    <p className="text-xs text-gray-400 mb-1">No IG Markets data...</p>
                                    <button onClick={() => navigate("/settings")} className="px-4 py-2 text-sm font-semibold rounded border border-[#1f2933]  mt-3 text-teal-400">
                                        Connect IG Account
                                    </button>
                                </>}
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
                                    Daily timeframe direction
                                </p>
                                {biasTime &&
                                    <p className="text-xs text-gray-500 tracking-wide mt-5">
                                        Valid for this day: {biasTime}
                                    </p>}
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
                        <div className="flex items-start gap-5">

                            {/* RING + STATUS COLUMN */}
                            <div className="flex flex-col items-center gap-3">

                                {/* RING CONTAINER */}
                                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-[#0b1016] border border-[#1f2933] shadow-inner">
                                    <div
                                        className="relative w-20 h-20 rounded-full flex items-center justify-center"
                                        style={{
                                            background:
                                                percentage >= 60 && percentage !== null
                                                    ? `conic-gradient(#2dd4bf ${percentage * 3.6}deg, #1f2933 0deg)`
                                                    : `conic-gradient(#fb7185 ${40 * 3.6}deg, #1f2933 0deg)`
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

                    </div>

                </div>

                {/* News and its companions (Live Price, FVG, Logs) */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                    {/* Left side: News*/}
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

                        {news && !isWeekend ? (
                            <p className={`font-semibold ${newsDecisionStyle(news)}`}>
                                {news}
                            </p>
                        ) : (
                            <p className="text-gray-400 font-semibold">
                                No news data available
                            </p>
                        )}

                        {newsEvents.length !== 0 && !isWeekend && (
                            <div className="mt-4 space-y-3 text-sm">
                                {newsEvents?.map((n, i) => {
                                    
                                    const eventDate = n.time.toDate().toLocaleString();
                                    const date = new Date(eventDate);
                                    const hours = date.getHours();
                                    const minutes = date.getMinutes();

                                    const ampm = hours >= 12 ? "PM" : "AM";
                                    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
                                    const formattedMinutes = minutes.toString().padStart(2, "0");
                                    const timeString = `${formattedHours}:${formattedMinutes} ${ampm}`;

                                    return (
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
                                                <span className="text-gray-400">{timeString}</span>
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
                                    )
                                })}
                            </div>
                        )}

                    </div>

                    {/* Right side: Live Price, FVG, Logs */}
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

                {/* Canvas */}

                {candles && (
                    <MarketCanvas
                        candles={candles}
                        fvgs={fvg ? [{
                            startTime: fvg.createdAt,
                            topPrice: fvg.gapHigh,
                            bottomPrice: fvg.gapLow,
                            middlePrice: fvg.gapMid || null,
                            fullVirgin: fvg.fullVirgin,
                        }] : []}
                        bias={signal?.potential?.toLowerCase() === "buy" ? "bullish" :
                            signal?.potential?.toLowerCase() === "sell" ? "bearish" :
                                fvg?.type?.toLowerCase() === "bullish" ? "bullish" :
                                    fvg?.type?.toLowerCase() === "bearish" ? "bearish" :
                                        "neutral"
                        }
                        dailyTargetPrice={dailyInfo?.target || null}
                    />
                )}

                {/* GUIDANCE BUTTON */}
                <button
                    onClick={() => setShowGuide(true)}
                    className="
        fixed
        bottom-6
        right-6
        z-50
        w-14
        h-14
        rounded-full
        bg-teal-500
        text-white
        text-2xl
        font-bold
        shadow-lg
        hover:bg-teal-400
        transition
        flex
        items-center
        justify-center
    "
                    aria-label="Guidance"
                >
                    ?
                </button>

                {/* GUIDANCE MODAL */}
                {showGuide && (
                    <div
                        className="
            fixed
            inset-0
            z-50
            bg-black/50
            flex
            items-end
            sm:items-center
            justify-center
        "
                        onClick={() => setShowGuide(false)}
                    >
                        <div
                            className="
                bg-[#0f141b]
                border
                border-[#1f2933]
                rounded-t-xl
                sm:rounded-xl
                p-6
                w-full
                sm:max-w-md
                text-gray-200
                shadow-2xl
            "
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* HEADER */}
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-extrabold tracking-wide">
                                    How This Bot Works
                                </h2>
                                <button
                                    onClick={() => setShowGuide(false)}
                                    className="text-gray-400 hover:text-gray-200 text-xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* CONTENT */}
                            <div className="space-y-4 text-sm leading-relaxed">
                                <p>
                                    <span className="font-semibold text-teal-400">Trading Strategy</span><br />
                                    This bot uses the <span className="font-semibold">Virgin Fair Value Gaps (FVG)</span> strategy
                                    to trade the <span className="font-semibold">EUR/USD</span> pair.<br />
                                    <span className="font-semibold">1- </span>Get the bias and FVG data then wait for the price to enter its range.<br />
                                    <span className="font-semibold">2- </span>Monitor the price in FVG and get a confirmation candle.<br />
                                    <span className="font-semibold">3- </span>Execute.
                                </p>
                                <p>
                                    <span className="font-semibold text-teal-400">Daily Bias</span><br />
                                    The trading bias is determined using the
                                    <span className="font-semibold"> last two daily candles</span>
                                    {' '}to define higher-timeframe direction.
                                </p>

                                <p>
                                    <span className="font-semibold text-teal-400">FVG Detection</span><br />
                                    The bot identifies the <span className="font-semibold">closest Fair Value Gap</span>.
                                    If <span className="font-semibold">half of the FVG is filled</span>,
                                    it is treated as non-virgin and used only 50% of it.
                                </p>
                            </div>

                            {/* FOOTER */}
                            <div className="mt-6 text-xs text-gray-500 italic">
                                This guidance is informational and does not guarantee performance.
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}