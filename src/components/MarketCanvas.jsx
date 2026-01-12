import { useEffect, useRef, useState, useMemo } from "react";

export default function MarketCanvas({ candles }) {
    const canvasRef = useRef(null);

    // ===== Constants =====
    const padding = 80; // Increased padding for axes
    const priceDecimals = 4; // For EUR/USD, typically 4-5 decimals
    const candleWidth = 6;
    const gap = 2;

    // ===== State =====
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);

    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // ===== Normalize candles (oldest → newest) =====
    const sorted = useMemo(() => {
        if (!candles || !candles.length) return [];
        return [...candles].sort(
            (a, b) => new Date(a.datetime) - new Date(b.datetime)
        );
    }, [candles]);

    // ===== Auto-scroll to latest candle =====
    useEffect(() => {
        if (!sorted.length || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        if (!rect.width) return;

        const totalWidth = sorted.length * (candleWidth + gap);
        const visibleWidth = rect.width - padding * 2;

        setOffsetX(visibleWidth - totalWidth);
        setOffsetY(0);
    }, [sorted]);

    // ===== Draw =====
    useEffect(() => {
        requestAnimationFrame(draw);
    }, [sorted, offsetX, offsetY]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        // Retina support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // ===== Background =====
        ctx.fillStyle = "#131722";
        ctx.fillRect(0, 0, rect.width, rect.height);

        // ===== Grid =====
        const gridSpacing = 50;
        ctx.strokeStyle = "#1f2533";
        ctx.lineWidth = 1;

        for (let y = gridSpacing; y < rect.height; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(rect.width, y);
            ctx.stroke();
        }

        for (let x = gridSpacing; x < rect.width; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, rect.height);
            ctx.stroke();
        }

        if (!sorted.length) return;

        // ===== Price scale =====
        const prices = sorted.flatMap(c => [c.high, c.low]);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const priceRange = Math.max(maxPrice - minPrice, 0.000001);

        const chartHeight = rect.height - padding * 2;

        const priceToY = price =>
            padding +
            ((maxPrice - price) / priceRange) * chartHeight +
            offsetY;

        // ===== Y-Axis (Price) =====
        ctx.font = "10px Arial";
        ctx.fillStyle = "#a7b1c2"; // Light gray for text
        ctx.textAlign = "left";

        // Determine number of ticks based on chart height
        const idealNumTicks = Math.floor(chartHeight / 50); // Approximately every 50px
        const tickPriceStep = priceRange / idealNumTicks;

        // Refine tick step to a "nice" number (e.g., 0.0001, 0.0002, 0.0005)
        const magnitude = 10 ** -priceDecimals; // e.g., 0.0001 for 4 decimals
        let niceTickStep = 0.00001; // Smallest possible step for EUR/USD
        const multipliers = [1, 2, 5]; // Common nice steps

        for (const m of multipliers) {
            if (tickPriceStep / (m * magnitude) <= 2) { // Find the smallest nice step that's larger than or close to the ideal
                niceTickStep = m * magnitude;
                break;
            } else if (m === 5) { // If 0.0005 is still too small, try 0.001 etc.
                niceTickStep = Math.ceil(tickPriceStep / (10 * magnitude)) * 10 * magnitude;
                break;
            }
        }
        
        let firstTickPrice = Math.floor(minPrice / niceTickStep) * niceTickStep;

        for (let price = firstTickPrice; price <= maxPrice; price += niceTickStep) {
            const y = priceToY(price);
            if (y > padding && y < rect.height - padding) {
                // Draw horizontal grid line
                ctx.beginPath();
                ctx.strokeStyle = "#1f2533"; // Lighter grid for labels
                ctx.lineWidth = 1;
                ctx.moveTo(padding, y);
                ctx.lineTo(rect.width - padding, y);
                ctx.stroke();

                // Draw price label
                ctx.fillText(price.toFixed(priceDecimals), rect.width - padding + 5, y + 3);
            }
        }

        // ===== Candles =====
        sorted.forEach((candle, i) => {
            const x = padding + i * (candleWidth + gap) + offsetX;
            if (x < -20 || x > rect.width + 20) return;

            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            const bullish = candle.close >= candle.open;

            //
            ctx.strokeStyle = bullish ? "#e5e7eb" : "#000000ff";
            ctx.beginPath();
            ctx.moveTo(x + candleWidth / 2, highY);
            ctx.lineTo(x + candleWidth / 2, lowY);
            ctx.stroke();

            // ===== Candle body with glow =====
            ctx.fillStyle = bullish
                ? "rgba(229,231,235,0.9)"
                : "#000000ff";

            if (bullish) {
                ctx.shadowColor = "gray";
                ctx.shadowBlur = 3;      // glow strength
                ctx.strokeStyle = "gray";
                ctx.lineWidth = .8;
            } else {
                ctx.shadowColor = "white";
                ctx.shadowBlur = 2;      // glow strength
                ctx.strokeStyle = "white";
                ctx.lineWidth = .8;
            };

            const bodyY = Math.min(openY, closeY);
            const bodyH = Math.max(1, Math.abs(openY - closeY));

            ctx.fillRect(x, bodyY, candleWidth, bodyH);
            ctx.strokeRect(x, bodyY, candleWidth, bodyH);
        });

        // ===== X-Axis (Time) =====
        ctx.font = "10px Arial";
        ctx.fillStyle = "#a7b1c2";
        ctx.textAlign = "center";
        ctx.textBaseline = "top"; // Align text to the top of the baseline

        // Iterate through candles to find suitable time labels (e.g., hourly)
        sorted.forEach((candle, i) => {
            const x = padding + i * (candleWidth + gap) + offsetX;
            // Check if it's a new hour or a significant interval
            const date = new Date(candle.datetime);
            const minutes = date.getMinutes();
            const hours = date.getHours();

            // Draw a label roughly every 15 candles or at the start of a new hour for better readability
            if (i % 15 === 0 || (minutes === 0 && i > 0)) { // Only draw if not the very first candle
                if (x > padding && x < rect.width - padding) {
                    // Draw vertical grid line
                    ctx.beginPath();
                    ctx.strokeStyle = "#1f2533";
                    ctx.lineWidth = 1;
                    ctx.moveTo(x + candleWidth / 2, padding);
                    ctx.lineTo(x + candleWidth / 2, rect.height - padding);
                    ctx.stroke();

                    // Draw time label
                    const label = (minutes === 0 && i > 0) ? `${hours.toString().padStart(2, '0')}:00` : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    ctx.fillText(label, x + candleWidth / 2, rect.height - padding + 5);
                }
            }
        });
    };

    // ===== Mouse handlers =====
    const onMouseDown = e => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = e => {
        if (!isDragging.current || !canvasRef.current) return;

        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;

        const rect = canvasRef.current.getBoundingClientRect();

        const minOffsetX =
            rect.width -
            padding * 2 - // Account for padding on both sides
            sorted.length * (candleWidth + gap);
        const maxOffsetX = padding;

        setOffsetX(prev =>
            Math.min(maxOffsetX, Math.max(minOffsetX, prev + dx))
        );
        setOffsetY(prev => prev + dy);

        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
        isDragging.current = false;
    };

    const resetView = () => {
        if (!canvasRef.current || !sorted.length) return;

        const rect = canvasRef.current.getBoundingClientRect();

        const lastIndex = sorted.length - 1;
        const lastCandleX =
            padding + lastIndex * (candleWidth + gap);

        const targetX =
            rect.width - padding; // Align with the right padding boundary

        const newOffsetX = targetX - lastCandleX;
        console.log({
            totalCandles: sorted.length,
            lastCandleX,
            targetX,
            newOffsetX
        });

        setOffsetX(newOffsetX);
        setOffsetY(0);
    };


    return (
        <div className="bg-[#0b0f14] rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm text-gray-300 font-semibold">
                    Market Structure
                </h2>

                <button
                    onClick={resetView}
                    className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
                >
                    Reset View
                </button>
            </div>

            <canvas
                ref={canvasRef}
                className="w-full h-[700px] cursor-grab active:cursor-grabbing"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            />
        </div>
    );
}
