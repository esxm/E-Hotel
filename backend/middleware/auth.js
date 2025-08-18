// middleware/auth.js
const { admin, db } = require("../firebase");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const idToken = header.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const role = decoded.role || "Customer";
    let assignedHotelIds = decoded.assignedHotelIds || [];
    let managedHotelIds = decoded.managedHotelIds || [];

    // Hydrate from Firestore if claims are missing
    if (role === "HotelManager" && managedHotelIds.length === 0) {
      const snap = await db.collection("hotelManagers").doc(decoded.uid).get();
      if (snap.exists) {
        const d = snap.data();
        managedHotelIds = Array.isArray(d.hotelIDs) ? d.hotelIDs : [];
      }
    }
    if (role === "Receptionist" && assignedHotelIds.length === 0) {
      const snap = await db.collection("receptionists").doc(decoded.uid).get();
      if (snap.exists && snap.data().hotelID) {
        assignedHotelIds = [snap.data().hotelID];
      }
    }

    req.user = {
      uid: decoded.uid,
      id: decoded.uid, // backward-compat field used in some controllers
      role,
      assignedHotelIds,
      managedHotelIds,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
