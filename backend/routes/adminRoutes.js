const express = require("express");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { db, admin } = require("../firebase");
const bookingSvc = require("../services/bookingService");

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// All admin routes require SystemAdmin role
router.use(role("SystemAdmin"));

// Get all hotel managers
router.get("/managers", async (req, res) => {
  try {
    const snapshot = await db.collection("hotelManagers").get();
    const managers = snapshot.docs.map(doc => ({
      managerID: doc.id,
      ...doc.data()
    }));
    res.json(managers);
  } catch (error) {
    console.error("Error fetching managers:", error);
    res.status(500).json({ error: "Failed to fetch managers" });
  }
});

// Get all receptionists
router.get("/receptionists", async (req, res) => {
  try {
    const snapshot = await db.collection("receptionists").get();
    const receptionists = snapshot.docs.map(doc => ({
      receptionistID: doc.id,
      ...doc.data()
    }));
    res.json(receptionists);
  } catch (error) {
    console.error("Error fetching receptionists:", error);
    res.status(500).json({ error: "Failed to fetch receptionists" });
  }
});

// Create a new customer
router.post("/customers", async (req, res) => {
  try {
    const { email, password = "123456", name, phoneNumber = "", idType = "id_card", idNumber = "", balance = 0 } = req.body;
    const user = await admin.auth().createUser({ email, password, displayName: name });
    await admin.auth().setCustomUserClaims(user.uid, { role: "Customer" });
    await db.collection("customers").doc(user.uid).set({
      name,
      phoneNumber,
      idType,
      idNumber,
      balance: Number(balance) || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ customerID: user.uid, name, email, phoneNumber, idType, idNumber, balance: Number(balance) || 0 });
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

// Update a customer profile
router.patch("/customers/:customerId", async (req, res) => {
  try {
    const { name, phoneNumber, idType, idNumber, balance } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phoneNumber !== undefined) update.phoneNumber = phoneNumber;
    if (idType !== undefined) update.idType = idType;
    if (idNumber !== undefined) update.idNumber = idNumber;
    if (balance !== undefined) update.balance = Number(balance) || 0;
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("customers").doc(req.params.customerId).update(update);
    const snap = await db.collection("customers").doc(req.params.customerId).get();
    res.json({ customerID: snap.id, ...snap.data() });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// Delete a customer
router.delete("/customers/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    await admin.auth().deleteUser(customerId).catch(() => {});
    await db.collection("customers").doc(customerId).delete().catch(() => {});
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});
// Create a new hotel manager (creates Auth user + Firestore doc)
router.post("/managers", async (req, res) => {
  try {
    const { email, password = "123456", name, phoneNumber } = req.body;
    const user = await admin.auth().createUser({ email, password, displayName: name });
    await admin.auth().setCustomUserClaims(user.uid, { role: "HotelManager" });
    await db.collection("hotelManagers").doc(user.uid).set({
      name,
      email,
      phoneNumber: phoneNumber || "",
      hotelIDs: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ managerID: user.uid, name, email, phoneNumber: phoneNumber || "", hotelIDs: [] });
  } catch (error) {
    console.error("Error creating manager:", error);
    res.status(500).json({ error: "Failed to create manager" });
  }
});

// Update a hotel manager profile
router.patch("/managers/:managerId", async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const ref = db.collection("hotelManagers").doc(req.params.managerId);
    await ref.update({
      ...(name ? { name } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    res.json({ managerID: snap.id, ...snap.data() });
  } catch (error) {
    console.error("Error updating manager:", error);
    res.status(500).json({ error: "Failed to update manager" });
  }
});

// Delete a manager (removes auth + clears hotel.managerId)
router.delete("/managers/:managerId", async (req, res) => {
  try {
    const { managerId } = req.params;
    await admin.auth().deleteUser(managerId).catch(() => {});
    await db.collection("hotelManagers").doc(managerId).delete().catch(() => {});
    const qs = await db.collection("hotels").where("managerId", "==", managerId).get();
    const batch = db.batch();
    qs.forEach((doc) => batch.update(doc.ref, { managerId: null }));
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting manager:", error);
    res.status(500).json({ error: "Failed to delete manager" });
  }
});

// Create a new receptionist
router.post("/receptionists", async (req, res) => {
  try {
    const { email, password = "123456", name, phoneNumber, hotelId = null } = req.body;
    const user = await admin.auth().createUser({ email, password, displayName: name });
    await admin.auth().setCustomUserClaims(user.uid, { role: "Receptionist" });
    await db.collection("receptionists").doc(user.uid).set({
      name,
      email,
      phoneNumber: phoneNumber || "",
      hotelID: hotelId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (hotelId) {
      await db
        .collection("hotels")
        .doc(hotelId)
        .update({ receptionistIds: admin.firestore.FieldValue.arrayUnion(user.uid) });
    }
    res.status(201).json({ receptionistID: user.uid, name, email, phoneNumber: phoneNumber || "", hotelID: hotelId });
  } catch (error) {
    console.error("Error creating receptionist:", error);
    res.status(500).json({ error: "Failed to create receptionist" });
  }
});

// Update receptionist profile
router.patch("/receptionists/:receptionistId", async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const ref = db.collection("receptionists").doc(req.params.receptionistId);
    await ref.update({
      ...(name ? { name } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    res.json({ receptionistID: snap.id, ...snap.data() });
  } catch (error) {
    console.error("Error updating receptionist:", error);
    res.status(500).json({ error: "Failed to update receptionist" });
  }
});

// Assign or unassign a receptionist to a single hotel (exclusive)
router.post("/receptionists/:receptionistId/assign", async (req, res) => {
  try {
    const { hotelId } = req.body; // null to unassign
    const { receptionistId } = req.params;
    // Remove from any current hotels
    const current = await db
      .collection("hotels")
      .where("receptionistIds", "array-contains", receptionistId)
      .get();
    const batch = db.batch();
    current.forEach((doc) => batch.update(doc.ref, { receptionistIds: admin.firestore.FieldValue.arrayRemove(receptionistId) }));
    await batch.commit();

    if (hotelId) {
      await db
        .collection("hotels")
        .doc(hotelId)
        .update({ receptionistIds: admin.firestore.FieldValue.arrayUnion(receptionistId) });
    }
    await db.collection("receptionists").doc(receptionistId).update({ hotelID: hotelId || null });
    res.json({ success: true });
  } catch (error) {
    console.error("Error assigning receptionist:", error);
    res.status(500).json({ error: "Failed to assign receptionist" });
  }
});

// Delete receptionist
router.delete("/receptionists/:receptionistId", async (req, res) => {
  try {
    const { receptionistId } = req.params;
    await admin.auth().deleteUser(receptionistId).catch(() => {});
    await db.collection("receptionists").doc(receptionistId).delete().catch(() => {});
    const qs = await db
      .collection("hotels")
      .where("receptionistIds", "array-contains", receptionistId)
      .get();
    const batch = db.batch();
    qs.forEach((doc) => batch.update(doc.ref, { receptionistIds: admin.firestore.FieldValue.arrayRemove(receptionistId) }));
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting receptionist:", error);
    res.status(500).json({ error: "Failed to delete receptionist" });
  }
});

// Assign or clear a manager for a hotel
router.post("/hotels/:hotelId/assign-manager", async (req, res) => {
  try {
    const { managerId } = req.body; // can be null to clear
    await db.collection("hotels").doc(req.params.hotelId).update({ managerId: managerId || null });
    res.json({ success: true });
  } catch (error) {
    console.error("Error assigning manager:", error);
    res.status(500).json({ error: "Failed to assign manager" });
  }
});

// Add or remove a receptionist assignment for a hotel
router.post("/hotels/:hotelId/receptionists", async (req, res) => {
  try {
    const { receptionistId, action } = req.body; // action: 'add' | 'remove'
    const ref = db.collection("hotels").doc(req.params.hotelId);
    if (action === "remove") {
      await ref.update({ receptionistIds: admin.firestore.FieldValue.arrayRemove(receptionistId) });
      // Also clear receptionist's hotelID if it matches this hotel
      const recRef = db.collection("receptionists").doc(receptionistId);
      const recSnap = await recRef.get();
      if (recSnap.exists && recSnap.data().hotelID === req.params.hotelId) {
        await recRef.update({ hotelID: null });
      }
    } else {
      await ref.update({ receptionistIds: admin.firestore.FieldValue.arrayUnion(receptionistId) });
      // Also set receptionist's hotelID to this hotel
      await db.collection("receptionists").doc(receptionistId).update({ hotelID: req.params.hotelId });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating receptionists:", error);
    res.status(500).json({ error: "Failed to update receptionist assignments" });
  }
});

// Get system statistics with advanced metrics
router.get("/stats", async (req, res) => {
  try {
    const [hotelsSnapshot, customersSnapshot, bookingsSnapshot, roomsSnapshot] = await Promise.all([
      db.collection("hotels").get(),
      db.collection("customers").get(),
      db.collection("bookings").get(),
      db.collection("rooms").get()
    ]);

    const totalHotels = hotelsSnapshot.size;
    const totalCustomers = customersSnapshot.size;
    const totalBookings = bookingsSnapshot.size;
    const totalRooms = roomsSnapshot.size;

    // Calculate advanced metrics
    let totalRevenue = 0;
    let activeBookings = 0;
    let checkedInGuests = 0;
    let availableRooms = 0;
    let occupiedRooms = 0;
    let maintenanceRooms = 0;

    // Process bookings
    bookingsSnapshot.docs.forEach(doc => {
      const booking = doc.data();
      if (booking.totalAmount) {
        totalRevenue += booking.totalAmount;
      }
      if (booking.status === "confirmed" || booking.status === "checked-in") {
        activeBookings++;
      }
      if (booking.status === "checked-in") {
        checkedInGuests++;
      }
    });

    // Process rooms
    roomsSnapshot.docs.forEach(doc => {
      const room = doc.data();
      if (room.status === "available") {
        availableRooms++;
      } else if (room.status === "occupied") {
        occupiedRooms++;
      } else if (room.status === "maintenance") {
        maintenanceRooms++;
      }
    });

    // Get recent bookings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentBookings = bookingsSnapshot.docs.filter(doc => {
      const booking = doc.data();
      return booking.createdAt && booking.createdAt.toDate() > thirtyDaysAgo;
    }).length;

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    res.json({
      totalHotels,
      totalCustomers,
      totalBookings,
      totalRooms,
      totalRevenue,
      recentBookings,
      activeBookings,
      checkedInGuests,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      occupancyRate: parseFloat(occupancyRate),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json({ error: "Failed to fetch system statistics" });
  }
});

// Get real-time room status for all hotels
router.get("/rooms/status", async (req, res) => {
  try {
    const [roomsSnapshot, bookingsSnapshot] = await Promise.all([
      db.collection("rooms").get(),
      db.collection("bookings").where("status", "in", ["confirmed", "checked-in"]).get()
    ]);

    const rooms = roomsSnapshot.docs.map(doc => ({
      roomID: doc.id,
      ...doc.data()
    }));

    const activeBookings = bookingsSnapshot.docs.map(doc => ({
      bookingID: doc.id,
      ...doc.data()
    }));

    // Enhance room data with current guest information
    const enhancedRooms = rooms.map(room => {
      const currentBooking = activeBookings.find(booking => 
        booking.roomID === room.roomID && 
        (booking.status === "checked-in" || booking.status === "confirmed")
      );

      return {
        ...room,
        currentGuest: currentBooking ? {
          customerName: currentBooking.customerName,
          checkInDate: currentBooking.checkInDate,
          checkOutDate: currentBooking.checkOutDate,
          bookingID: currentBooking.bookingID,
          status: currentBooking.status
        } : null
      };
    });

    res.json(enhancedRooms);
  } catch (error) {
    console.error("Error fetching room status:", error);
    res.status(500).json({ error: "Failed to fetch room status" });
  }
});

// Get hotel-specific analytics
router.get("/hotels/:hotelId/analytics", async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { year, month } = req.query;

    // Get hotel bookings and rooms
    const [bookingsSnapshot, roomsSnapshot] = await Promise.all([
      db.collection("bookings").where("hotelID", "==", hotelId).get(),
      db.collection("rooms").where("hotelID", "==", hotelId).get()
    ]);

    const bookings = bookingsSnapshot.docs.map(doc => doc.data());
    const rooms = roomsSnapshot.docs.map(doc => doc.data());
    
    // Calculate analytics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === "checked-out").length;
    const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;
    const activeBookings = bookings.filter(b => b.status === "checked-in").length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    // Room statistics
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === "available").length;
    const occupiedRooms = rooms.filter(r => r.status === "occupied").length;
    const maintenanceRooms = rooms.filter(r => r.status === "maintenance").length;
    
    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

    // Monthly revenue if year/month provided
    let monthlyRevenue = 0;
    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      monthlyRevenue = bookings
        .filter(b => {
          const bookingDate = b.createdAt?.toDate() || new Date();
          return bookingDate >= startDate && bookingDate <= endDate;
        })
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    }

    res.json({
      hotelId,
      totalBookings,
      completedBookings,
      cancelledBookings,
      activeBookings,
      totalRevenue,
      monthlyRevenue,
      totalRooms,
      availableRooms,
      occupiedRooms,
      maintenanceRooms,
      occupancyRate: parseFloat(occupancyRate),
      period: year && month ? `${year}-${month}` : "all-time"
    });
  } catch (error) {
    console.error("Error fetching hotel analytics:", error);
    res.status(500).json({ error: "Failed to fetch hotel analytics" });
  }
});

// Get all bookings enriched and normalized like staff views
router.get("/bookings", async (req, res) => {
  try {
    // Reuse booking service to enrich data
    const enriched = await bookingSvc.listBookings();
    // Flatten some fields for current admin UI compatibility
    const normalized = enriched
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((b) => ({
        bookingID: b.bookingID,
        hotelID: b.hotelID,
        customerID: b.customerID,
        roomDetails: b.roomDetails,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        checkedOutAt: b.checkedOutAt,
        cancellationGracePeriod: b.cancellationGracePeriod,
        totalAmount: b.totalAmount,
        status: b.status,
        paymentStatus: b.paymentStatus,
        hasInvoice: b.hasInvoice,
        createdAt: b.createdAt,
        // Extra fields used by admin UI
        customerName: b.customerDetails?.name || "",
        customerEmail: b.customerDetails?.email || "",
        customerPhone: b.customerDetails?.phoneNumber || "",
        roomNumber: Array.isArray(b.roomDetails) && b.roomDetails.length ? b.roomDetails[0].roomNumber : undefined,
      }));
    res.json(normalized);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Get guest check-in/check-out history
router.get("/guests/history", async (req, res) => {
  try {
    const snapshot = await db.collection("bookings")
      .where("status", "in", ["checked-in", "checked-out"])
      .orderBy("checkInDate", "desc")
      .get();
    
    const guestHistory = snapshot.docs.map(doc => ({
      bookingID: doc.id,
      ...doc.data()
    }));
    
    res.json(guestHistory);
  } catch (error) {
    console.error("Error fetching guest history:", error);
    res.status(500).json({ error: "Failed to fetch guest history" });
  }
});

// Get maintenance requests
router.get("/maintenance", async (req, res) => {
  try {
    const snapshot = await db.collection("maintenanceRequests").orderBy("createdAt", "desc").get();
    const maintenanceRequests = snapshot.docs.map(doc => ({
      requestID: doc.id,
      ...doc.data()
    }));
    res.json(maintenanceRequests);
  } catch (error) {
    console.error("Error fetching maintenance requests:", error);
    res.status(500).json({ error: "Failed to fetch maintenance requests" });
  }
});

// Create maintenance request
router.post("/maintenance", async (req, res) => {
  try {
    const { roomID, hotelID, issue, priority, description } = req.body;
    
    const maintenanceRequest = {
      roomID,
      hotelID,
      issue,
      priority,
      description,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection("maintenanceRequests").add(maintenanceRequest);
    
    // Update room status to maintenance
    await db.collection("rooms").doc(roomID).update({
      status: "maintenance",
      updatedAt: new Date()
    });
    
    res.status(201).json({
      requestID: docRef.id,
      ...maintenanceRequest
    });
  } catch (error) {
    console.error("Error creating maintenance request:", error);
    res.status(500).json({ error: "Failed to create maintenance request" });
  }
});

// Update maintenance request status
router.patch("/maintenance/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, notes } = req.body;
    
    const updateData = {
      status,
      notes,
      updatedAt: new Date()
    };
    
    await db.collection("maintenanceRequests").doc(requestId).update(updateData);
    
    // If maintenance is completed, update room status back to available
    if (status === "completed") {
      const requestDoc = await db.collection("maintenanceRequests").doc(requestId).get();
      const requestData = requestDoc.data();
      
      await db.collection("rooms").doc(requestData.roomID).update({
        status: "available",
        updatedAt: new Date()
      });
    }
    
    res.json({ message: "Maintenance request updated successfully" });
  } catch (error) {
    console.error("Error updating maintenance request:", error);
    res.status(500).json({ error: "Failed to update maintenance request" });
  }
});

// Get revenue analytics
router.get("/revenue/analytics", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    const snapshot = await db.collection("bookings").get();
    const bookings = snapshot.docs.map(doc => doc.data());
    
    let revenueData = {};
    
    if (period === "month") {
      // Group by month
      const currentYear = new Date().getFullYear();
      for (let month = 1; month <= 12; month++) {
        const monthBookings = bookings.filter(b => {
          const bookingDate = b.createdAt?.toDate() || new Date();
          return bookingDate.getFullYear() === currentYear && bookingDate.getMonth() === month - 1;
        });
        
        revenueData[month] = monthBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      }
    } else if (period === "week") {
      // Group by week
      const currentDate = new Date();
      const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
      const weeks = Math.ceil((currentDate - startOfYear) / (7 * 24 * 60 * 60 * 1000));
      
      for (let week = 1; week <= weeks; week++) {
        const weekStart = new Date(startOfYear);
        weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekBookings = bookings.filter(b => {
          const bookingDate = b.createdAt?.toDate() || new Date();
          return bookingDate >= weekStart && bookingDate <= weekEnd;
        });
        
        revenueData[week] = weekBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      }
    }
    
    res.json({
      period,
      revenueData,
      totalRevenue: Object.values(revenueData).reduce((sum, revenue) => sum + revenue, 0)
    });
  } catch (error) {
    console.error("Error fetching revenue analytics:", error);
    res.status(500).json({ error: "Failed to fetch revenue analytics" });
  }
});

module.exports = router;
