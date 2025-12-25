const {getLivePrice} = require('../api/dataFeed');

async function isPriceInFVG(fvg) {
    const price = await getLivePrice();
    // console.log("Current Live EUR/USD Price:", price);
    if (priceInFVG(price, fvg)) {
        return {price: price, inFVG: true};
    } else {
        return {price: price, inFVG: false};
    }
}

function priceInFVG(price, fvg) {
    return price >= fvg.gapLow && price <= fvg.gapHigh;
}




module.exports = { isPriceInFVG };
