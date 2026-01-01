import { useEffect, useRef, useState } from "react";

export default function MarketCanvas({ candles }) {
    const canvasRef = useRef(null);

    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);

    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Normalize candles (oldest → newest)
    const sorted = [...candles].sort(
        (a, b) => new Date(a.datetime) - new Date(b.datetime)
    );

    useEffect(() => {
        draw();
    }, [candles, offsetX, offsetY]);

    const draw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Handle retina screens
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // --- Background ---
        ctx.fillStyle = "#131722";
        ctx.fillRect(0, 0, rect.width, rect.height);

        // --- Grid lines ---
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

        const prices = sorted.flatMap(c => [c.high, c.low]);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);

        const padding = 60;
        const chartHeight = rect.height - padding * 2;
        const candleWidth = 6;
        const gap = 2;

        const priceToY = price =>
            padding +
            ((maxPrice - price) / (maxPrice - minPrice)) * chartHeight +
            offsetY;

        // --- Candles ---
        sorted.forEach((candle, i) => {
            const x = padding + i * (candleWidth + gap) + offsetX;
            if (x < -20 || x > rect.width + 20) return;

            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);
            const bullish = candle.close >= candle.open;

            // Wick
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
            }

            const bodyY = Math.min(openY, closeY);
            const bodyH = Math.max(1, Math.abs(openY - closeY));

            ctx.fillRect(x, bodyY, candleWidth, bodyH);
            ctx.strokeRect(x, bodyY, candleWidth, bodyH);

            // Reset glow so it doesn't affect grid
            ctx.shadowBlur = 0;
        });
    };

    // --- Mouse handlers ---
    const onMouseDown = e => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = e => {
        if (!isDragging.current) return;

        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;

        setOffsetX(prev => prev + dx);
        setOffsetY(prev => prev + dy);

        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
        isDragging.current = false;
    };

    const resetView = () => {
        setOffsetX(-sorted.length * 4); // jump to latest
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
