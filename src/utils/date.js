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

function getLocalAsiaSessionStart() {
    // 09:00 in Tokyo today
    const now = new Date();

    // Get today's date in Tokyo
    const tokyoDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(now); // YYYY-MM-DD

    // Create a Date for 09:00 Tokyo time
    const tokyoSessionStart = new Date(`${tokyoDate}T09:00:00+09:00`);

    // Convert to local time
    return {
        hour: tokyoSessionStart.getHours(),
        minute: tokyoSessionStart.getMinutes()
    };
}


function getNextAsiaSessionDate() {
    const { hour, minute } = getLocalAsiaSessionStart();
    const now = new Date();

    // Asia session start TODAY (local time)
    const nextAsiaSession = new Date(now).toISOString().split("T")[0] + "T" + hour.toString().padStart(2, '0') + ":" + minute.toString().padStart(2, '0') + ":00";
    // If already passed → move to tomorrow
    if (new Date(nextAsiaSession) <= now) {
        // Add 1 day by creating a new Date
        const tomorrow = new Date(nextAsiaSession);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = new Date(tomorrow).toISOString().split("T")[0] + "T" + hour.toString().padStart(2, '0') + ":" + minute.toString().padStart(2, '0') + ":00";

        return tomorrowString; // or keep as string if you prefer
    }

    return nextAsiaSession;
}


async function setTimeZone () {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log("🌐 Detected Timezone:", timezone);
    return timezone;
}

async function checkIfWeekend () {
    const date = new Date();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday

    return day === 0 || day === 6;
}
module.exports = { is15MinBoundary, timeToMinutes, getNextAsiaSessionDate, setTimeZone, checkIfWeekend };

