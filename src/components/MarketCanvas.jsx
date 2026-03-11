import { useEffect, useRef, useState, useMemo, useCallback } from "react";

export default function MarketCanvas({ candles, fvgs, bias, dailyTargetPrice }) {
    const canvasRef = useRef(null);

    // ===== Constants =====
    const padding = 80; // Increased padding for axes
    const priceDecimals = 4; // For EUR/USD, typically 4-5 decimals
    const [candleWidth, setCandleWidth] = useState(12); // Increased for wider candles
    const [gap, setGap] = useState(4); // Increased gap between candles

    // ===== State =====
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [userInteracted, setUserInteracted] = useState(false);
    const [visibleMinPrice, setVisibleMinPrice] = useState(0);
    const [visibleMaxPrice, setVisibleMaxPrice] = useState(0);
    const [userZoomedY, setUserZoomedY] = useState(false);
    const [userZoomedX, setUserZoomedX] = useState(false);

    const isPanning = useRef(false); // For X and Y-axis panning when dragging inside chart area
    const isYAxisZooming = useRef(false); // For Y-axis zooming when dragging on Y-axis label area
    const isXAxisZooming = useRef(false); // For X-axis zooming when dragging on X-axis label area
    const lastPos = useRef({ x: 0, y: 0 }); // For all dragging interactions

    // ===== Normalize candles (oldest → newest) =====
    const sorted = useMemo(() => {
        if (!candles || !candles.length) return [];
        return [...candles].sort(
            (a, b) => new Date(a.datetime) - new Date(b.datetime)
        );
    }, [candles]);

    // Calculate initial visible price range (with default 3x zoom)
    useEffect(() => {
        if (!sorted.length || userZoomedY) return; // Don't reset if user has zoomed vertically
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
    }, [sorted, userZoomedY]);

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
        setUserInteracted(true); // User has interacted, disable auto-scroll
        setUserZoomedY(true); // User has zoomed vertically
    }, [canvasRef, padding, offsetY, visibleMinPrice, visibleMaxPrice, setVisibleMinPrice, setVisibleMaxPrice, sorted, setUserInteracted, setUserZoomedY]);

    // ===== Auto-scroll to latest candle =====
    useEffect(() => {
        if (userInteracted) return; // Don't auto-scroll if user has interacted

        if (!sorted.length || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        if (!rect.width) return;

        const totalWidth = sorted.length * (candleWidth + gap);
        const visibleWidth = rect.width - padding * 2;

        setOffsetX(visibleWidth - totalWidth);
        setOffsetY(0);
    }, [sorted, userInteracted]);

    // Attach non-passive wheel event listener
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]); // handleWheel should be stable (e.g., wrapped in useCallback or its dependencies are stable)

    const datetimeToX = useCallback((datetime) => {
        if (!sorted.length) return -1;

        // Find the index of the candle at or just before the given datetime
        let index = sorted.findIndex(candle => new Date(candle.datetime).getTime() >= new Date(datetime).getTime());

        if (index === -1) {
            // If datetime is after all candles, use the last candle's position
            index = sorted.length - 1;
        } else if (index > 0 && new Date(sorted[index].datetime).getTime() > new Date(datetime).getTime()) {
            // If the found candle is after the datetime, use the previous candle's position
            // This is to ensure the FVG starts from or before its creation time
            index--;
        }

        const x = padding + index * (candleWidth + gap) + offsetX;
        return x;
    }, [sorted, padding, candleWidth, gap, offsetX]);

    const goToLatestCandle = useCallback(() => {
        if (!sorted.length || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        if (!rect.width) return;

        const totalWidth = sorted.length * (candleWidth + gap);
        const visibleWidth = rect.width - padding * 2;

        setOffsetX(visibleWidth - totalWidth);
        // Do not change offsetY, visibleMinPrice, visibleMaxPrice, candleWidth, gap
        setUserInteracted(false); // Re-enable auto-scroll after going to latest
    }, [sorted, canvasRef, candleWidth, gap, padding, setOffsetX, setUserInteracted]);

    // ===== Draw =====
    useEffect(() => {
        requestAnimationFrame(draw);
    }, [sorted, offsetX, offsetY, visibleMinPrice, visibleMaxPrice, fvgs, bias, dailyTargetPrice, candleWidth, gap]);

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

        // ===== Draw FVGs =====
        if (fvgs && fvgs.length > 0) {
            fvgs.forEach(fvg => {
                const startX = datetimeToX(fvg.startTime);
                // If fvg.endTime is not provided, extend to the latest candle
                const endX = fvg.endTime ? datetimeToX(fvg.endTime) : datetimeToX(sorted[sorted.length - 1].datetime);

                const startY = priceToY(fvg.topPrice);
                const endY = priceToY(fvg.bottomPrice);

                // Ensure proper rectangle dimensions (width and height must be positive)
                const fvgWidth = Math.max(1, endX - startX + candleWidth); // Add candleWidth to ensure it covers the last candle
                const fvgHeight = Math.max(1, Math.abs(endY - startY));

                // Calculate the top-left Y coordinate for the rectangle
                const rectY = Math.min(startY, endY);

                // Set color based on bias
                let fillColor = "rgba(128, 128, 128, 0.2)"; // Neutral gray default
                if (bias === "bullish") {
                    fillColor = "rgba(0, 255, 0, 0.2)"; // Light green for bullish
                } else if (bias === "bearish") {
                    fillColor = "rgba(255, 0, 0, 0.2)"; // Light red for bearish
                }

                ctx.fillStyle = fillColor;
                ctx.fillRect(startX, rectY, fvgWidth, fvgHeight);
            });
        }

        // ===== Draw Daily Target Line =====
        if (dailyTargetPrice !== null && sorted.length > 0) {
            // Find the first candle of the current day
            const lastCandleDate = new Date(sorted[sorted.length - 1].datetime);
            lastCandleDate.setHours(0, 0, 0, 0); // Normalize to the beginning of the day

            let firstCandleOfCurrentDay = null;
            // Iterate backward to find the first candle of the current day
            for (let i = sorted.length - 1; i >= 0; i--) {
                const candleDate = new Date(sorted[i].datetime);
                candleDate.setHours(0, 0, 0, 0);

                if (candleDate.getTime() === lastCandleDate.getTime()) {
                    firstCandleOfCurrentDay = sorted[i];
                } else {
                    // Once we hit a previous day, and we've found a current day candle, we can stop
                    if (firstCandleOfCurrentDay) break;
                }
            }

            if (firstCandleOfCurrentDay) {
                const targetY = priceToY(dailyTargetPrice);
                const targetStartX = datetimeToX(firstCandleOfCurrentDay.datetime);
                const targetEndX = datetimeToX(sorted[sorted.length - 1].datetime) + candleWidth; // Extend to the end of the latest candle

                ctx.strokeStyle = "teal"; // teal color for target line
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 5]); // Dashed line

                ctx.beginPath();
                ctx.moveTo(targetStartX, targetY);
                ctx.lineTo(targetEndX, targetY);
                ctx.stroke();

                ctx.setLineDash([]);
            }
        }

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

        const totalCandleWidth = candleWidth + gap;
        const minLabelSpacing = 80; // Minimum pixels between labels to prevent overlap

        // Define possible time intervals in minutes
        const intervals = [15, 30, 60, 120, 240, 360, 720, 1440]; // 15min, 30min, 1h, 2h, 4h, 6h, 12h, 1day

        let chosenIntervalMinutes = 60; // Default to hourly
        let prevLabelX = -Infinity;

        // Determine the best interval based on zoom level
        for (const interval of intervals) {
            // Approximate number of candles in this interval. Assuming 1-minute candles for simplicity of interval calculation
            // If candles are not 1-minute, this logic needs adjustment. Assuming current candles are fixed interval.
            const candlesPerInterval = interval; // If each candle is 1 min, then 60 candles = 1 hour.
            const intervalPixelWidth = candlesPerInterval * totalCandleWidth;

            if (intervalPixelWidth > minLabelSpacing) {
                chosenIntervalMinutes = interval;
                break;
            }
        }

        let prevDate = null; // To track changes in day for day labels

        // Iterate through candles to draw labels
        sorted.forEach((candle, i) => {
            const x = padding + i * totalCandleWidth + offsetX;
            const date = new Date(candle.datetime);
            const minutes = date.getMinutes();
            const hours = date.getHours();
            const day = date.getDate();
            const month = date.getMonth();

            // Skip if candle is outside visible range, or too close to previous label
            if (x < padding || x > rect.width - padding) return;

            let labelToDraw = null;
            let drawThisLabel = false;

            // Logic for drawing day labels (if crossing a new day)
            if (prevDate && prevDate.getDate() !== day) {
                labelToDraw = `${(month + 1).toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`; // M/D format
                drawThisLabel = true;
            } else if (minutes % chosenIntervalMinutes === 0) { // Draw based on chosen interval
                labelToDraw = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`; // HH:MM format
                drawThisLabel = true;
            }

            if (drawThisLabel) {
                // Ensure label doesn't overlap with previous one
                if (x - prevLabelX > minLabelSpacing) {
                    ctx.fillText(labelToDraw, x + candleWidth / 2, rect.height - 5); // -5 to lift it slightly from bottom
                    prevLabelX = x;
                }
            }
            prevDate = date;
        });
    };

    // ===== Mouse handlers =====
    const onMouseDown = e => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        const mouseCanvasX = e.clientX - rect.left;
        const mouseCanvasY = e.clientY - rect.top;

        // Check if click is on the X-axis label area (bottom padding) first
        if (mouseCanvasY > rect.height - padding) {
            isXAxisZooming.current = true;
        }
        // Check if click is on the *narrow* Y-axis scale region (e.g., last 30px of the canvas width)
        else if (mouseCanvasX > rect.width - 30) { // A wider strip for Y-axis zooming
            isYAxisZooming.current = true;
        }
        // Otherwise, it's a drag in the main chart area (for panning)
        else {
            isPanning.current = true;
        }

        lastPos.current = { x: e.clientX, y: e.clientY };
        setUserInteracted(true); // User has interacted, disable auto-scroll
    };

    const onMouseMove = e => {
        if (!isPanning.current && !isYAxisZooming.current && !isXAxisZooming.current || !canvasRef.current) return;

        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const currentChartHeight = canvas.height / (window.devicePixelRatio || 1) - padding * 2;

        const currentPriceRange = Math.max(visibleMaxPrice - visibleMinPrice, 0.000001);
        const pricePerPixel = currentPriceRange / currentChartHeight;

        if (isPanning.current) {
            // Apply X-axis panning
            const minOffsetX =
                rect.width -
                padding * 2 -
                sorted.length * (candleWidth + gap);
            const maxOffsetX = padding;

            setOffsetX(prev =>
                Math.min(maxOffsetX, Math.max(minOffsetX, prev + dx))
            );

            // Apply Y-axis panning
            const panSensitivityY = 0.5; // Adjust this value (e.g., 0.1 to 1.0) for desired sensitivity
            const priceChange = dy * pricePerPixel * panSensitivityY;
            setVisibleMinPrice(prev => prev + priceChange);
            setVisibleMaxPrice(prev => prev + priceChange);
        } else if (isYAxisZooming.current) {
            // Y-axis zooming (like wheel scroll, but with drag)
            const zoomFactor = 1.05; // Same as wheel scroll
            const mouseCanvasY = lastPos.current.y - rect.top; // Y position relative to canvas
            const priceAtMouse = visibleMaxPrice -
                (mouseCanvasY - padding - offsetY) / currentChartHeight * (visibleMaxPrice - visibleMinPrice);

            let newMinPrice = visibleMinPrice;
            let newMaxPrice = visibleMaxPrice;

            if (dy > 0) { // Dragging down zooms out
                newMinPrice = priceAtMouse - (priceAtMouse - visibleMinPrice) * zoomFactor;
                newMaxPrice = priceAtMouse + (visibleMaxPrice - priceAtMouse) * zoomFactor;
            } else if (dy < 0) { // Dragging up zooms in
                newMinPrice = priceAtMouse - (priceAtMouse - visibleMinPrice) / zoomFactor;
                newMaxPrice = priceAtMouse + (visibleMaxPrice - priceAtMouse) / zoomFactor;
            }

            const minAllowedPriceRange = 0.0001;
            const maxOverallPrice = Math.max(...sorted.flatMap(c => [c.high, c.low]));
            const minOverallPrice = Math.min(...sorted.flatMap(c => [c.high, c.low]));
            const maxAllowedPriceRange = (maxOverallPrice - minOverallPrice) * 2;

            const currentRange = newMaxPrice - newMinPrice;

            if (newMinPrice < newMaxPrice && currentRange >= minAllowedPriceRange && currentRange <= maxAllowedPriceRange) {
                setVisibleMinPrice(newMinPrice);
                setVisibleMaxPrice(newMaxPrice);
                setUserZoomedY(true); // User has explicitly zoomed Y-axis
            }
        } else if (isXAxisZooming.current) {
            // X-axis zooming (expending and reducing candles size)
            // dx > 0 means drag right (zoom out / reduce width)
            // dx < 0 means drag left (zoom in / increase width)

            // Define a very small fixed increment/decrement per pixel of drag
            const changePerPixel = 0.025; // Adjusted this value for sensitivity (50% reduction)
            const gapRatio = 0.2; // How much gap changes relative to candleWidth

            let newCandleWidth = candleWidth;
            let newGap = gap;

            // Calculate current mouse X relative to the canvas for the anchor point
            const mouseCanvasX = lastPos.current.x - rect.left;

            // Find the candle index under the mouse cursor *before* the zoom
            // This is approximate but good enough for anchoring the zoom
            // Ensure divisor is not zero to prevent NaN
            const divisor = (candleWidth + gap);
            const currentCandleIndex = divisor !== 0 ? Math.floor((mouseCanvasX - padding - offsetX) / divisor) : 0;

            // Determine the change for candleWidth and gap
            if (dx > 0) { // Dragging right zooms out (reduce width)
                newCandleWidth = candleWidth - changePerPixel * Math.abs(dx);
                newGap = gap - changePerPixel * Math.abs(dx) * gapRatio;
            } else if (dx < 0) { // Dragging left zooms in (increase width)
                newCandleWidth = candleWidth + changePerPixel * Math.abs(dx);
                newGap = gap + changePerPixel * Math.abs(dx) * gapRatio;
            }

            // Clamp values and store them in constants for use in setOffsetX
            const finalNewCandleWidth = Math.max(2, Math.min(newCandleWidth, 50));
            const finalNewGap = Math.max(1, Math.min(newGap, 10));

            // Calculate the new offsetX to anchor the right edge of the chart
            setOffsetX(prevOffsetX => {
                const visibleChartWidth = rect.width - padding * 2;
                const newTotalContentWidth = sorted.length * (finalNewCandleWidth + finalNewGap);

                // Calculate the offsetX that anchors the rightmost candle
                // The rightmost edge of the last candle should align with the right boundary of the chart area.
                // Position of the right edge of the last candle: padding + totalContentWidth + offsetX
                // We want this to be equal to rect.width - padding.
                // So, offsetX = (rect.width - padding) - (padding + totalContentWidth)
                let newOffsetX = (rect.width - padding) - (padding + newTotalContentWidth);

                // --- CLAMPING LOGIC FOR X-AXIS ---
                // Ensure newOffsetX doesn't push the first candle past the left padding
                const minOffsetX = visibleChartWidth - newTotalContentWidth;
                const maxOffsetX = padding; // The furthest right the first candle can be

                // The calculated offsetX needs to be clamped
                return Math.min(maxOffsetX, Math.max(minOffsetX, newOffsetX));
            });

            setCandleWidth(finalNewCandleWidth);
            setGap(finalNewGap);

            setUserZoomedX(true); // User has explicitly zoomed X-axis
        }

        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
        isPanning.current = false;
        isYAxisZooming.current = false;
        isXAxisZooming.current = false;
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

        // Reset X-axis zoom (candleWidth and gap) to their initial values
        setCandleWidth(12); // Initial value
        setGap(4); // Initial value

        setUserInteracted(false); // Re-enable auto-scroll
        setUserZoomedY(false); // Re-enable default vertical zoom
        setUserZoomedX(false); // Re-enable default horizontal zoom
    };

    const onTouchStart = e => {
        if (!e.touches.length) return;

        const touch = e.touches[0];

        onMouseDown({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    };

    const onTouchMove = e => {
        if (!e.touches.length) return;

        const touch = e.touches[0];

        onMouseMove({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    };

    const onTouchEnd = () => {
        onMouseUp();
    };

    return (
        <div className="bg-[#0b0f14] rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm text-gray-300 font-semibold">
                    Market Structure
                </h2>

                <div className="flex gap-2 items-center">
                    <h2 className="px-3 py-1 text-xs border-2 border-teal-800 border-dashed rounded">Daily target</h2>

                    <h2 className="px-3 py-1 text-xs 
                    bg-[linear-gradient(to_right,rgba(255,0,0,0.2)_50%,rgba(0,255,0,0.2)_50%)] 
                    rounded">
                        FVG
                    </h2>
                </div>


                <button
                    onClick={resetView}
                    className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
                >
                    Reset View
                </button>
            </div>

            <div className="relative w-full h-[700px]">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}

                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                />
                <button
                    onClick={goToLatestCandle}
                    className="absolute top-2 left-2 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center z-10"
                    title="Go to Latest Candle"
                >
                    {/* SVG for right arrow */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
