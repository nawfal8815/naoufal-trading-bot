const fetch = require('node-fetch');
const config = require('../../config/config');

async function getTodaysEurUsdEvents(date = new Date()) {
    try {
        const formattedDate = date.toISOString().split('T')[0];
        const apiKey = config.tradingEconomics.apiKey;

        const apiUrl = `${config.tradingEconomics.baseUrl}/calendar?c=${apiKey}&d1=${formattedDate}&d2=${formattedDate}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            console.error(`API Error: ${response.status}`);
            return [];
        }

        const allEvents = await response.json();

        if (!Array.isArray(allEvents)) {
            console.error('Expected array but got:', typeof allEvents);
            return [];
        }

        // Filter for EUR/USD events
        const filteredEvents = allEvents.filter(event => {
            (event.currency === 'EUR' || event.currency === 'USD') && event.Date.split('T')[0] === formattedDate;
        }).map(event => ({
            time: event.Date.split('T')[1].substring(0, 5) || 'All Day',
            currency: event.Currency,
            impact: event.Importance === 3 ? 'High' :
                event.Importance === 2 ? 'Medium' : 'Low',
            source: 'TradingEconomics'
        }));

        return filteredEvents;

    } catch (error) {
        console.error('Failed to fetch calendar:', error.message);
        return [];
    }
}

module.exports = { getTodaysEurUsdEvents };