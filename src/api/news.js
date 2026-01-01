const puppeteer = require('puppeteer');
const { postData } = require('../server/apiClient');

const getNews = async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
    });

    const page = await browser.newPage();

    // Set cookies first
    await page.setCookie({
        name: 'ff_timezone',
        value: 'America/New_York',
        domain: '.forexfactory.com'
    });

    console.log('Navigating for news...');
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

                // --- Time handling (FIX) ---
                const timeEl = row.querySelector('.calendar__time');
                const currentTime = timeEl?.textContent.trim();

                if (currentTime) {
                    timeHolder = currentTime; // update FIRST
                }

                let impact = 'N/A';

                const allSpans = row.querySelectorAll('span');
                for (const span of allSpans) {
                    const title = span.getAttribute('title');
                    if (title?.includes('Impact Expected')) {
                        if (title.includes('High Impact Expected')) impact = 'High';
                        else if (title.includes('Medium Impact Expected')) impact = 'Medium';
                        else impact = 'Low';
                        break;
                    }
                }

                const currency = row.querySelector('.calendar__currency')?.textContent.trim() || '';

                if (currency === 'USD' || currency === 'EUR') {
                    data.push({
                        time: timeHolder, // ALWAYS correct
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