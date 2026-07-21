/**
 * ONE-TIME SETUP SCRIPT — run this locally, NOT on the server.
 *
 * Grants the Firebase "admin" custom claim to a user, so they can access
 * the admin panel and admin-only backend endpoints.
 *
 * Usage:
 *   node setAdmin.js someone@example.com
 *
 * Requires serviceAccountKey.json to be present in this folder
 * (same file used by server.js).
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = process.argv[2];

if (!email) {
  console.error("Usage: node setAdmin.js <email>");
  process.exit(1);
}

admin
  .auth()
  .getUserByEmail(email)
  .then((user) =>
    admin.auth().setCustomUserClaims(user.uid, { admin: true })
  )
  .then(() => {
    console.log(`✅ ${email} is now an admin.`);
    console.log(
      "They must log out and log back in on the site for this to take effect."
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
  });