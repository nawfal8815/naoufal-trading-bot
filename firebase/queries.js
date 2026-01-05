const { db, admin } = require("./firebaseAdmin");

async function saveLog(data) {
    try {
        await db.collection("Logs").add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            Log: data.log
        });
    } catch (err) {
        console.error(err);
    }
}

async function saveDailyInfo(data) {
    try {
        await db.collection("Daily_Info").add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            bias: data.bias,
            tradeQuality: data.quality,
            fvg: data.fvg
        });
    } catch (err) {
        console.error(err);
    }
}

async function saveLivePrice(data) {
    try {
        const snapshot = await db.collection("Live_Price").get();
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
        }
        await db.collection("Live_Price").add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            price: data.price
        });
    } catch (err) {
        console.error(err);
    }
}

async function savePosition(data) {
    try {
        await db.collection("Positions").add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            direction: data.potential,
            entryPrice: data.entryPrice,
            stopLoss: data.sl,
            takeProfit: data.tp,
            positionSize: data.positionSize,
            epic: data.epic
        });
    } catch (err) {
        console.error(err);
    }
}

async function saveNews(data) {
    try {
        const snapshot = await db.collection("News").get();
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
        }
        await db.collection("News").add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            decision: data.decision,
            events: data.events
        });
    } catch (err) {
        console.error(err);
    }
}

async function getData(col) {
    try {
        return await db.collection(col).get();
    } catch (err) {
        console.error(err);
    }
}

module.exports = { saveLog, saveDailyInfo, saveLivePrice, saveNews, savePosition, getData };