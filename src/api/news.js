const puppeteer = require("puppeteer");

async function getTodaysEurUsdEvents() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 30,
        args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
        ]
    });

    const page = await browser.newPage();
    await page.goto("https://www.forexfactory.com/calendar", {
        waitUntil: "networkidle2"
    });

    await page.waitForSelector("table.calendar__table");

    const events = await page.evaluate(() => {
        const rows = document.querySelectorAll("tr.calendar__row");
        const results = [];

        let lastTime = null;
        let lastCurrency = null;

        rows.forEach(row => {
            const timeEl = row.querySelector(".calendar__time");
            const currencyEl = row.querySelector(".calendar__currency");
            const titleEl = row.querySelector(".calendar__event");
            const impactEl = row.querySelector(".calendar__impact span");

            if (timeEl && timeEl.innerText.trim()) {
                lastTime = timeEl.innerText.trim();
            }

            if (currencyEl && currencyEl.innerText.trim()) {
                lastCurrency = currencyEl.innerText.trim();
            }

            if (!titleEl || !lastCurrency) return;

            if (lastCurrency === "EUR" || lastCurrency === "USD") {
                let impact = "Low";
                if (impactEl?.classList.contains("impact__high")) impact = "High";
                else if (impactEl?.classList.contains("impact__medium")) impact = "Medium";

                results.push({
                    time: lastTime,
                    currency: lastCurrency,
                    title: titleEl.innerText.trim(),
                    impact
                });
            }
        });

        return results;
    });

    await browser.close();
    return events;
}


module.exports = { getTodaysEurUsdEvents };