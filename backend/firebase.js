// firebase.js
require("dotenv").config();
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

const dbId = process.env.FIRESTORE_DATABASE_ID; // e.g. "e-hotel" or "e-hotel-sdm-db"

if (!dbId) {
  throw new Error("MISSING FIRESTORE DATABASE ID");
}

// Initialize Firebase Admin
try {
  let credential;

  // Check if service account key path is provided via environment variable
  if (process.env.FIREBASE_SDK_SA_KEY) {
    const serviceAccountPath = process.env.FIREBASE_SDK_SA_KEY;
    console.log(
      "🔑 Using service account credentials from path:",
      serviceAccountPath
    );

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `Firebase service account file not found at path: ${serviceAccountPath}`
      );
    }

    console.log(
      "📄 Credentials file exists and size:",
      fs.statSync(serviceAccountPath).size,
      "bytes"
    );
    credential = admin.credential.cert(serviceAccountPath);
  } else {
    throw new Error(
      "FIREBASE_SDK_SA_KEY environment variable is required but not set"
    );
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
