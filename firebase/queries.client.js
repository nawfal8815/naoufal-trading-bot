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

export async function getUserInfo(uid, colName = "UserSettings") {
    if (!uid) throw new Error("No user ID provided");

    try {
        const userRef = doc(db, colName, uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) return { email: null, displayName: null, emailVerified: null };

        const data = docSnap.data();
        return {
            email: data.email || null,
            displayName: data.displayName || null,
            emailVerified: data.emailVerified || null
        };
    } catch (err) {
        console.error("Failed to fetch user info:", err);
        return { email: null, displayName: null, emailVerified: null };
    }
}

export async function checkIfExists(colName = "UserSettings", changingData, type) {

    try {
        const q = query(
        collection(db, colName));
        const docSnap = await getDocs(q);

        if (docSnap.empty) return false;
        for (const doc of docSnap.docs) {
            const data = doc.data();
            if (type === "email" && data.email === changingData) return true;
            if (type === "displayName" && data.displayName === changingData) return true;
        }
        return false;
    } catch (err) {
        console.error("Failed to fetch user info:", err);
        return null;
    }
}

export async function saveUserSettings(uid, newSettings) {
    if (!uid) throw new Error("No user ID provided");

    try {
        const userRef = doc(db, "UserSettings", uid);
        const docSnap = await getDoc(userRef);

        let mergedSettings = {};

        if (docSnap.exists()) {
            // Merge existing data with new settings
            mergedSettings = { ...docSnap.data(), ...newSettings };
        } else {
            mergedSettings = { ...newSettings };
        }

        // Save merged settings
        await setDoc(userRef, mergedSettings, { merge: true });
        return true;
    } catch (err) {
        console.error("Error saving user settings:", err);
        return false;
    }
}

export async function getUserIG(uid, colName = "UserSettings") {
    if (!uid) throw new Error("No user ID provided");

    try {
        const userRef = doc(db, colName, uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) return false;

        const data = docSnap.data();
        return { igChecked: data.igChecked, igAccount: data.igAccount };
    } catch (err) {
        console.error("Failed to fetch user info:", err);
        return false;
    }
}

export async function getLogs(colName = "Logs") {
    const q = query(
        collection(db, colName),
        orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    return {
        snap: snap.docs
    };
}

