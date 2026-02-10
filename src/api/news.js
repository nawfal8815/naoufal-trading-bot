const puppeteer = require('puppeteer');
const chalk = require('chalk').default;

const getNews = async (processId) => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
    });

    const page = await browser.newPage();

    page.on('pageerror', err => console.error('PAGE ERROR:', err));
    page.on('requestfailed', req => console.error('REQ FAIL:', req.url()));


    // page.on('console', msg => {
    //     console.log('PAGE LOG:', msg.text());
    // });

    console.log(`[${chalk.blue.underline(processId)}]: Navigating for news...`);
    await page.goto('https://www.forexfactory.com/', {
        waitUntil: 'networkidle0',
        timeout: 60000
    });

    const news = await page.evaluate(async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
            const rows = document.querySelectorAll('.calendar__row:not(.calendar__row--day-breaker)');
            const data = [];


            let timeHolder = '';

            rows.forEach(row => {
                const eventEl = row.querySelector('.calendar__event-title');
                if (!eventEl || !eventEl.textContent.trim()) return;

                const timeEl = row.querySelector('.calendar__time');
                const rawTime = timeEl?.textContent.trim() || '';

                // Only accept real clock times
                const timeRegex = /^\d{1,2}:\d{2}(am|pm)$/i;
                if (timeRegex.test(rawTime)) {
                    timeHolder = rawTime;
                }

                const currency =
                    row.querySelector('.calendar__currency')?.textContent.trim() || '';

                let impact = 'N/A';
                for (const span of row.querySelectorAll('span')) {
                    const title = span.getAttribute('title');
                    if (title?.includes('Impact Expected')) {
                        impact = title.includes('High') ? 'High'
                            : title.includes('Medium') ? 'Medium'
                                : 'Low';
                        break;
                    }
                }

                if (currency === 'USD' || currency === 'EUR' || currency === 'All') {
                    data.push({
                        time: timeHolder,
                        currency,
                        event: eventEl.textContent.trim(),
                        impact
                    });
                }
            });



            if (data.length > 0) return data;

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return [];
    });

    await browser.close();
    return news;
};

module.exports = { getNews }