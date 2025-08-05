const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// This function sets a custom claim on a user account.
// Call it by visiting its URL with a `uid` parameter.
// Example: https://us-central1-your-project-id.cloudfunctions.net/setAdmin?uid=THE_USER_UID_YOU_COPIED
exports.setAdmin = functions.https.onRequest(async (req, res) => {
  // Get the UID from the query parameter.
  const uid = req.query.uid;

  if (!uid) {
    return res.status(400).send("Please provide a UID in the query string, e.g., ?uid=your_uid");
  }

  try {
    // Set the custom claim { admin: true } on the user.
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    return res.status(200).send(`Success! User ${uid} has been made an admin.`);
  } catch (error) {
    console.error("Error setting custom claim:", error);
    return res.status(500).send("An error occurred.");
  }
});