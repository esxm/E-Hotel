const router = require("express").Router();
const ctl = require("../controllers/hotelManagerController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { db, admin } = require("../firebase");

// Apply auth middleware to all routes
router.use(auth);

// Individual routes with role checks
router.get(
  "/:hotelId/stats/monthly",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      await ctl.getMonthlyStats(req, res);
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

router.patch(
  "/:hotelId",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      await ctl.patchHotel(req, res);
    } catch (error) {
      if (error.status) {
        res.status(error.status).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

module.exports = router;

// === Additional Manager APIs ===

// Hotel analytics (manager scoped)
router.get(
  "/:hotelId/analytics",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      const { hotelId } = req.params;
      const [bookingsSnapshot, roomsSnapshot] = await Promise.all([
        db.collection("bookings").where("hotelID", "==", hotelId).get(),
        db.collection("rooms").where("hotelID", "==", hotelId).get(),
      ]);

      const bookings = bookingsSnapshot.docs.map((d) => d.data());
      const rooms = roomsSnapshot.docs.map((d) => d.data());

      const totalBookings = bookings.length;
      const activeBookings = bookings.filter((b) => b.status === "checked-in").length;
      const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      const totalRooms = rooms.length;
      const availableRooms = rooms.filter((r) => r.status === "available").length;
      const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
      const maintenanceRooms = rooms.filter((r) => r.status === "maintenance").length;
      const occupancyRate = totalRooms > 0 ? occupiedRooms / totalRooms : 0;

      res.json({
        hotelId,
        totalBookings,
        activeBookings,
        cancelledBookings,
        totalRevenue,
        totalRooms,
        availableRooms,
        occupiedRooms,
        maintenanceRooms,
        occupancyRate,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  }
);

// List receptionists for a hotel
router.get(
  "/:hotelId/receptionists",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      // Show receptionists whose hotelID equals this hotel OR whose id is in hotel's receptionistIds array
      const hotelDoc = await db.collection("hotels").doc(req.params.hotelId).get();
      const hotelData = hotelDoc.data() || {};
      const idList = hotelData.receptionistIds || [];

      const byField = await db
        .collection("receptionists")
        .where("hotelID", "==", req.params.hotelId)
        .get();
      const setA = new Map(byField.docs.map(d => [d.id, { receptionistID: d.id, ...d.data() }]));

      if (idList.length > 0) {
        const byIds = await db.collection("receptionists").where(admin.firestore.FieldPath.documentId(), "in", idList.slice(0,10)).get();
        byIds.docs.forEach(d => setA.set(d.id, { receptionistID: d.id, ...d.data() }));
        // Firestore 'in' has max 10; if more, fetch remaining ids individually
        for (let i = 10; i < idList.length; i++) {
          const d = await db.collection("receptionists").doc(idList[i]).get();
          if (d.exists) setA.set(d.id, { receptionistID: d.id, ...d.data() });
        }
      }

      const list = Array.from(setA.values());
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: "Failed to load receptionists" });
    }
  }
);

// Create receptionist for the manager's hotel
router.post(
  "/:hotelId/receptionists",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      const { email, password = "123456", name, phoneNumber = "" } = req.body;
      const { hotelId } = req.params;
      const user = await admin.auth().createUser({ email, password, displayName: name });
      await admin.auth().setCustomUserClaims(user.uid, { role: "Receptionist" });
      await db.collection("receptionists").doc(user.uid).set({
        name,
        email,
        phoneNumber,
        hotelID: hotelId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db
        .collection("hotels")
        .doc(hotelId)
        .update({ receptionistIds: admin.firestore.FieldValue.arrayUnion(user.uid) });
      res.status(201).json({ receptionistID: user.uid, name, email, phoneNumber, hotelID: hotelId });
    } catch (error) {
      res.status(500).json({ error: "Failed to create receptionist" });
    }
  }
);

// Update receptionist
router.patch(
  "/:hotelId/receptionists/:receptionistId",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      const { name, phoneNumber } = req.body;
      await db
        .collection("receptionists")
        .doc(req.params.receptionistId)
        .update({ ...(name ? { name } : {}), ...(phoneNumber ? { phoneNumber } : {}) });
      const doc = await db.collection("receptionists").doc(req.params.receptionistId).get();
      res.json({ receptionistID: doc.id, ...doc.data() });
    } catch (error) {
      res.status(500).json({ error: "Failed to update receptionist" });
    }
  }
);

// Delete receptionist
router.delete(
  "/:hotelId/receptionists/:receptionistId",
  role("HotelManager", "SystemAdmin"),
  async (req, res) => {
    try {
      const { hotelId, receptionistId } = { ...req.params };
      await admin.auth().deleteUser(receptionistId).catch(() => {});
      await db.collection("receptionists").doc(receptionistId).delete().catch(() => {});
      await db
        .collection("hotels")
        .doc(hotelId)
        .update({ receptionistIds: admin.firestore.FieldValue.arrayRemove(receptionistId) });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete receptionist" });
    }
  }
);
