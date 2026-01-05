const { db, admin } = require("./firebaseAdmin");

const collections = ["Daily_Info", "Logs", "Positions", "Live_Price", "News"];

async function initCollections() {
  for (const col of collections) {
    try {
      const snapshot = await db
        .collection(col)
        .limit(1)
        .get();

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

module.exports = { initCollections }
