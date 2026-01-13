const { db, admin } = require("./firebaseAdmin");

async function saveLog(data) {
    try {
        await db.collection("Logs").add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            Log: data
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
            target: data.target,
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
        const snapshot = await db.collection(col).get();
        if (snapshot.empty) return;
        return snapshot;
    } catch (err) {
        console.error(err);
    }
}

async function getUserSettingsById(uid) {
    try {
        const userRef = db.collection("UserSettings").doc(uid);
        const docSnap = await userRef.get();
        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (err) {
        console.error("Failed to get user settings by ID:", err);
        return null;
    }
}

async function telegramChecked(id) {
    try {
        const ref = db.collection("UserSettings").doc(id);
        const snapshot = await ref.get();
        if (!snapshot.exists) return;
        await ref.update({
            telegramChecked: true
        });
    } catch (err) {
        console.error(err);
    }
}

async function igMarketsChecked(id) {
    try {
        const ref = db.collection("UserSettings").doc(id);
        const snapshot = await ref.get();
        if (!snapshot.exists) return;
        await ref.update({
            igChecked: true
        });
    } catch (err) {
        console.error(err);
    }
}

async function igMarketsundefiened(id) {
    try {
        const ref = db.collection("UserSettings").doc(id);
        const snapshot = await ref.get();
        if (snapshot.size === 0) console.log(0);
        await ref.update({
            igUndefined: true
        });
    } catch (err) {
        console.error(err);
    }
}

async function saveUserBalance(uid, balance) {
    try {
        const ref = db.collection("UserSettings").doc(uid);
        const snapshot = await ref.get();

        if (!snapshot.exists) return;

        await ref.update({
            "igAccount.balance": balance,
            "igAccount.balanceUpdatedAt": admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to save user balance:", err);
    }
}


module.exports = { saveLog, saveDailyInfo, saveLivePrice, saveNews, savePosition, getData, getUserSettingsById, telegramChecked, igMarketsChecked, igMarketsundefiened, saveUserBalance };