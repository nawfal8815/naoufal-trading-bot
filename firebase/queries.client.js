import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    setDoc,
    getDoc,
    doc
} from "firebase/firestore";
import { db } from "./firebase";

// Generic: get latest document from a collection
export async function getLatest(colName) {
    const q = query(
        collection(db, colName),
        orderBy("createdAt", "desc"),
        limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    return {
        id: snap.docs[0].id,
        ...snap.docs[0].data()
    };
}

export async function saveUserSettingsTelegram(uid, newSettings) {
    if (!uid) throw new Error("No user ID provided");

    try {
        const userRef = doc(db, "UserSettings", uid);
        const docSnap = await getDoc(userRef);

        let mergedSettings = {};

        if (docSnap.exists()) {
            // Merge existing data with new settings
            mergedSettings = { ...docSnap.data(), ...newSettings, telegramChecked: false };
        } else {
            mergedSettings = { ...newSettings, telegramChecked: false  };
        }

        // Save merged settings
        await setDoc(userRef, mergedSettings, { merge: true });

        console.log("User settings saved:");
        return true;
    } catch (err) {
        console.error("Error saving user settings:", err);
        return false;
    }
}

export async function saveUserSettingsIGMarkets(uid, newSettings) {
    if (!uid) throw new Error("No user ID provided");

    try {
        const userRef = doc(db, "UserSettings", uid);
        const docSnap = await getDoc(userRef);

        let mergedSettings = {};

        if (docSnap.exists()) {
            // Merge existing data with new settings
            mergedSettings = { ...docSnap.data(), ...newSettings, igChecked: false };
        } else {
            mergedSettings = { ...newSettings, igChecked: false };
        }

        // Save merged settings
        await setDoc(userRef, mergedSettings, { merge: true });

        console.log("User settings saved:");
        return true;
    } catch (err) {
        console.error("Error saving user settings:", err);
        return false;
    }
}

