import { useEffect, useRef, useState, useMemo, useCallback } from "react";

export default function MarketCanvas({ candles }) {
    const canvasRef = useRef(null);

    // ===== Constants =====
    const padding = 80; // Increased padding for axes
    const priceDecimals = 4; // For EUR/USD, typically 4-5 decimals
    const candleWidth = 12; // Increased for wider candles
    const gap = 4; // Increased gap between candles

    // ===== State =====
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [visibleMinPrice, setVisibleMinPrice] = useState(0);
    const [visibleMaxPrice, setVisibleMaxPrice] = useState(0);

    const isDragging = useRef(false); // For X-axis panning
    const isYAxisDragging = useRef(false); // For Y-axis panning/scaling
    const lastPos = useRef({ x: 0, y: 0 }); // For both X-axis and Y-axis drag start position

    // ===== Normalize candles (oldest → newest) =====
    const sorted = useMemo(() => {
        if (!candles || !candles.length) return [];
        return [...candles].sort(
            (a, b) => new Date(a.datetime) - new Date(b.datetime)
        );
    }, [candles]);

    // Calculate initial visible price range (with default 3x zoom)
    useEffect(() => {
        if (!sorted.length) return;
        const prices = sorted.flatMap(c => [c.high, c.low]);
        const minOverallPrice = Math.min(...prices);
        const maxOverallPrice = Math.max(...prices);

        const initialRange = maxOverallPrice - minOverallPrice;
        const zoomFactor = 3; // 3x zoom (show 1/3rd of the range)
        const targetRange = initialRange / zoomFactor;

        // Center the view around the latest candle's close price
        const latestClosePrice = sorted[sorted.length - 1].close;

        let newMinPrice = latestClosePrice - targetRange / 2;
        let newMaxPrice = latestClosePrice + targetRange / 2;

        // Boundary checks to ensure new range doesn't exceed overall min/max
        if (newMinPrice < minOverallPrice) {
            newMinPrice = minOverallPrice;
            newMaxPrice = minOverallPrice + targetRange;
        }
        if (newMaxPrice > maxOverallPrice) {
            newMaxPrice = maxOverallPrice;
            newMinPrice = maxOverallPrice - targetRange;
        }

        // Ensure minimum range is maintained to prevent visual glitches
        if (newMaxPrice - newMinPrice < 0.0001) { // A small arbitrary minimum range
            newMinPrice = latestClosePrice - 0.00005;
            newMaxPrice = latestClosePrice + 0.00005;
        }


        setVisibleMaxPrice(newMaxPrice);
        setVisibleMinPrice(newMinPrice);
    }, [sorted]);

    const handleWheel = useCallback(e => {
        e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const zoomFactor = 1.05; // Adjust zoom speed
        const mouseCanvasY = e.clientY - canvas.getBoundingClientRect().top; // Y position relative to canvas
        const currentChartHeight = canvas.height / (window.devicePixelRatio || 1) - padding * 2;

        const prices = sorted.flatMap(c => [c.high, c.low]); // Define prices here
        let maxOverallPrice = 0;
        let minOverallPrice = 0;

        if (prices.length > 0) {
            maxOverallPrice = Math.max(...prices);
            minOverallPrice = Math.min(...prices);
        }

        // Convert mouse Y to a price level
        const priceAtMouse = visibleMaxPrice -
            (mouseCanvasY - padding - offsetY) / currentChartHeight * (visibleMaxPrice - visibleMinPrice);

        let newMinPrice = visibleMinPrice;
        let newMaxPrice = visibleMaxPrice;

        if (e.deltaY < 0) { // Zoom in
            newMinPrice = priceAtMouse - (priceAtMouse - visibleMinPrice) / zoomFactor;
            newMaxPrice = priceAtMouse + (visibleMaxPrice - priceAtMouse) / zoomFactor;
        } else { // Zoom out
            newMinPrice = priceAtMouse - (priceAtMouse - visibleMinPrice) * zoomFactor;
            newMaxPrice = priceAtMouse + (visibleMaxPrice - priceAtMouse) * zoomFactor;
        }

        // Basic boundary checks (optional, can be refined)
        // Ensure new min is less than new max, and prevent excessive zoom
        const minAllowedPriceRange = 0.0001; // Example: Minimum price difference to prevent infinite zoom
        const maxAllowedPriceRange = (maxOverallPrice - minOverallPrice) * 2; // Use overall price range
        
        const currentRange = newMaxPrice - newMinPrice;

        if (newMinPrice < newMaxPrice && currentRange >= minAllowedPriceRange && currentRange <= maxAllowedPriceRange) {
            setVisibleMinPrice(newMinPrice);
            setVisibleMaxPrice(newMaxPrice);
        }
    }, [canvasRef, padding, offsetY, visibleMinPrice, visibleMaxPrice, setVisibleMinPrice, setVisibleMaxPrice, sorted]);

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

    // Attach non-passive wheel event listener
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]); // handleWheel should be stable (e.g., wrapped in useCallback or its dependencies are stable)

    // ===== Draw =====
    useEffect(() => {
        requestAnimationFrame(draw);
    }, [sorted, offsetX, offsetY, visibleMinPrice, visibleMaxPrice]);

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
        // Use visible price range from state
        const currentMaxPrice = visibleMaxPrice;
        const currentMinPrice = visibleMinPrice;
        const priceRange = Math.max(currentMaxPrice - currentMinPrice, 0.000001);

        const chartHeight = rect.height - padding * 2;

        const priceToY = price =>
            padding +
            ((currentMaxPrice - price) / priceRange) * chartHeight +
            offsetY;

        // ===== Y-Axis (Price) =====
        ctx.font = "10px Arial";
        ctx.fillStyle = "#a7b1c2"; // Light gray for text
        ctx.textAlign = "right";

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
        
        let firstTickPrice = Math.floor(currentMinPrice / niceTickStep) * niceTickStep;

        for (let price = firstTickPrice; price <= currentMaxPrice; price += niceTickStep) {
            const y = priceToY(price);
            if (y > padding && y < rect.height - padding) {
                // Draw price label
                ctx.fillText(price.toFixed(priceDecimals), rect.width, y + 3);
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
        ctx.textBaseline = "bottom"; // Align text to the bottom of the baseline

        // Iterate through candles to find suitable time labels (e.g., hourly)
        sorted.forEach((candle, i) => {
            const x = padding + i * (candleWidth + gap) + offsetX;
            // Check if it's a new hour or a significant interval
            const date = new Date(candle.datetime);
            const minutes = date.getMinutes();
            const hours = date.getHours();

            if (minutes === 0) { // Only draw at the start of each hour
                if (x > padding && x < rect.width - padding) {
                    // Draw time label
                    const label = `${hours.toString().padStart(2, '0')}:00`;
                    ctx.fillText(label, x + candleWidth / 2, rect.height);
                }
            }
        });
    };

    // ===== Mouse handlers =====
    const onMouseDown = e => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        // Check if click is on the Y-axis label area (right padding)
        if (e.clientX > rect.right - padding) {
            isYAxisDragging.current = true;
        } else {
            // Otherwise, it's for X-axis panning
            isDragging.current = true;
        }
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = e => {
        if (!isDragging.current && !isYAxisDragging.current || !canvasRef.current) return;

        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const currentChartHeight = canvas.height / (window.devicePixelRatio || 1) - padding * 2;
        // Ensure priceRange is not zero to avoid division by zero
        const currentPriceRange = Math.max(visibleMaxPrice - visibleMinPrice, 0.000001);
        const pricePerPixel = currentPriceRange / currentChartHeight;

        if (isDragging.current) { // X-axis panning
            const minOffsetX =
                rect.width -
                padding * 2 -
                sorted.length * (candleWidth + gap);
            const maxOffsetX = padding;

            setOffsetX(prev =>
                Math.min(maxOffsetX, Math.max(minOffsetX, prev + dx))
            );
        } else if (isYAxisDragging.current) { // Y-axis panning/scrolling
            const priceChange = dy * pricePerPixel;
            setVisibleMinPrice(prev => prev + priceChange);
            setVisibleMaxPrice(prev => prev + priceChange);
        }

        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
        isDragging.current = false;
        isYAxisDragging.current = false;
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

        // Reset Y-axis zoom to full range
        const prices = sorted.flatMap(c => [c.high, c.low]);
        setVisibleMaxPrice(Math.max(...prices));
        setVisibleMinPrice(Math.min(...prices));
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
