const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { readFileSync, existsSync } = require('fs');

// Load your Firebase Service Account key file.
// SECURITY: serviceAccountKey.json grants full admin access to this Firebase
// project. Never commit it to the repo — add it to .gitignore, keep it out of
// the static site directory entirely, and never ship it anywhere near the
// public site files (index.html, style.css, etc. are served as-is).
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(
    `Missing ${SERVICE_ACCOUNT_PATH}. Download it from Firebase Console > ` +
    `Project Settings > Service Accounts > Generate New Private Key, save it ` +
    `next to this script, and make sure it's listed in .gitignore before running again.`
  );
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateLegacyArticles() {
  const articlesRef = db.collection('articles');
  const snapshot = await articlesRef.get();

  if (snapshot.empty) {
    console.log('No articles found.');
    return;
  }

  let updatedCount = 0;
  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.createdAt) {
      batch.update(doc.ref, {
        createdAt: FieldValue.serverTimestamp()
      });
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`Successfully updated ${updatedCount} legacy article(s) with createdAt timestamps!`);
  } else {
    console.log('All articles already have a createdAt timestamp. No migration needed.');
  }
}

migrateLegacyArticles().catch(console.error);