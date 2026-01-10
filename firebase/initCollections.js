const { db, admin } = require("./firebaseAdmin");

const collections = ["Daily_Info", "Logs", "Positions", "Live_Price", "News"];

async function clearCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

async function initCollections() {
  for (const col of collections) {
    try {
      // 🧹 Special case: Logs → always delete first
      if (col === "Logs") {
        await clearCollection(col);

        await db.collection(col).add({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          _init: true,
        });

        console.log(`Logs collection cleared and re-initialized`);
        continue;
      }

      // ✅ Normal behavior for other collections
      const snapshot = await db.collection(col).limit(1).get();

      if (snapshot.empty) {
        await db.collection(col).add({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          _init: true,
        });
      }
    } catch (err) {
      console.error(`Failed to check/init collection "${col}"`, err);
    }
  }

  console.log("Collection check complete");
}

module.exports = { initCollections };
