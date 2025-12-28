const { getLivePrice } = require('../api/dataFeed');
const { postData } = require('../server/apiClient');

async function isPriceInFVG(fvg) {
    const price = await getLivePrice();
    await postData({
        type: "livePrice",
        timestamp: new Date().toISOString(),
        price: price
    });
    // console.log("Current Live EUR/USD Price:", price);
    if (priceInFVG(price, fvg)) {
        return { price: price, inFVG: true };
    } else {
        return { price: price, inFVG: false };
    }
}

function priceInFVG(price, fvg) {
    return price >= fvg.gapLow && price <= fvg.gapHigh;
}




module.exports = { isPriceInFVG };
