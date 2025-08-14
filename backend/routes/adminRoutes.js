const express = require("express");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { db } = require("../firebase");

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

// Get all bookings with guest details
router.get("/bookings", async (req, res) => {
  try {
    const snapshot = await db.collection("bookings").orderBy("createdAt", "desc").get();
    const bookings = snapshot.docs.map(doc => ({
      bookingID: doc.id,
      ...doc.data()
    }));
    res.json(bookings);
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
