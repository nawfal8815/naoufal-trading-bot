function is15MinBoundary(date = new Date()) {
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return (
        [0, 15, 30, 45].includes(minutes) &&
        seconds < 10 // buffer to avoid duplicate calls
    );
}


function timeToMinutes(timeStr) {
    if (!timeStr || timeStr === "All Day") return null;

    const match = timeStr.match(/(\d+):(\d+)(am|pm)/i);
    if (!match) return null;

    let [_, hour, minute, period] = match;
    hour = parseInt(hour);
    minute = parseInt(minute);

    if (period.toLowerCase() === "pm" && hour !== 12) hour += 12;
    if (period.toLowerCase() === "am" && hour === 12) hour = 0;

    return hour * 60 + minute;
}


module.exports = { is15MinBoundary, timeToMinutes };

