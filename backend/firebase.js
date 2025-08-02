// firebase.js
require("dotenv").config();
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

const dbId = process.env.FIRESTORE_DATABASE_ID; // e.g. "e-hotel" or "e-hotel-sdm-db"

// Initialize Firebase Admin
try {
  let credential;

  // Check if service account key is provided via environment variable
  if (process.env.FIREBASE_SDK_SA_CREDENTIALS) {
    console.log(
      "🔑 Using service account credentials from environment variable:",
      process.env.FIREBASE_SDK_SA_CREDENTIALS
    );
    credential = admin.credential.cert(process.env.FIREBASE_SDK_SA_CREDENTIALS);
  } else {
    // Fallback to local file (for development)
    const serviceAccountPath = path.join(
      process.cwd(),
      "credentials",
      "firebase-sa.json"
    );
    console.log("🔍 Looking for credentials at:", serviceAccountPath);
    console.log(
      "📁 Credentials directory exists:",
      fs.existsSync(path.dirname(serviceAccountPath))
    );
    console.log(
      "📄 Credentials file exists:",
      fs.existsSync(serviceAccountPath)
    );

    if (fs.existsSync(serviceAccountPath)) {
      console.log(
        "📝 Credentials file size:",
        fs.statSync(serviceAccountPath).size,
        "bytes"
      );
    }

    credential = admin.credential.cert(serviceAccountPath);
  }

  admin.initializeApp({
    credential: credential,
  });

  console.log(
    "ℹ️  Using service account credentials, project:",
    admin.app().options.projectId
  );

  // Initialize Firestore
  const db = dbId ? getFirestore(admin.app(), dbId) : getFirestore(admin.app());
  console.log("🎯 Connected to Firestore database:", dbId || "(default)");

  module.exports = { admin, db };
} catch (error) {
  throw error;
}
