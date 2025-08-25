const { db } = require("../firebase");
const aiSvc = require("../services/aiService");

exports.assessCancellationRisk = async (req, res) => {
  const { bookingId } = req.params;
  try {
    const snap = await db.collection("bookings").doc(bookingId).get();
    if (!snap.exists) return res.status(404).json({ error: "Booking not found" });
    const b = snap.data();

    // Gather lightweight features
    const checkIn = b.checkInDate?.toDate ? b.checkInDate.toDate() : new Date(b.checkInDate);
    const now = new Date();
    const daysUntilCheckIn = Math.max(0, Math.ceil((checkIn - now) / 86400000));

    // Count customer history
    let priorCancels = 0;
    let priorAttended = 0;
    const hist = await db
      .collection("bookings")
      .where("customerID", "==", b.customerID)
      .get();
    hist.docs.forEach((d) => {
      const s = d.data().status;
      if (s === "cancelled") priorCancels++;
      if (s === "checked-in" || s === "checked-out") priorAttended++;
    });

    // Hotel recent cancel rate
    let hotelCancelRate = 0;
    const hotelSnap = await db
      .collection("bookings")
      .where("hotelID", "==", b.hotelID)
      .get();
    if (!hotelSnap.empty) {
      const total = hotelSnap.size;
      const cancels = hotelSnap.docs.filter((d) => d.data().status === "cancelled").length;
      hotelCancelRate = total ? cancels / total : 0;
    }

    const features = {
      totalAmount: b.totalAmount || 0,
      daysUntilCheckIn,
      graceHours: b.cancellationGracePeriod || 24,
      paymentStatus: b.paymentStatus || "unknown",
      priorCancels,
      priorAttended,
      hotelCancelRate,
    };

    const result = await aiSvc.assessCancellationRisk({
      bookingId,
      features,
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.detectAnomalies = async (req, res) => {
  const { hotelId } = req.params;
  const horizonDays = Math.min(60, Math.max(7, Number(req.query.days) || 30));
  try {
    // Build a daily series for the horizon
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - horizonDays + 1);

    const snap = await db
      .collection("bookings")
      .where("hotelID", "==", hotelId)
      .get();

    const byDay = new Map();
    for (let i = 0; i < horizonDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      byDay.set(d.toISOString().slice(0, 10), { bookings: 0, cancels: 0 });
    }

    snap.docs.forEach((doc) => {
      const b = doc.data();
      const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : null;
      if (!createdAt) return;
      const key = createdAt.toISOString().slice(0, 10);
      if (!byDay.has(key)) return;
      byDay.get(key).bookings += 1;
      if (b.status === 'cancelled') byDay.get(key).cancels += 1;
    });

    const series = Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
    const result = await aiSvc.detectAnomalies({ series, horizonDays });
    res.json({ ...result, series });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.revenueForecast = async (req, res) => {
  const hotelId = req.query.hotelId || req.params.hotelId || req.hotelId;
  try {
    if (!hotelId) return res.status(400).json({ error: 'Missing hotelId' });
    const now = new Date();
    const month = now.toISOString().slice(0,7);
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth()+1, 0);

    const snap = await db.collection('bookings').where('hotelID', '==', hotelId).get();
    let completedRevenue = 0; // checked-out this month
    let pipelineRevenue = 0; // booked or checked-in overlapping this month
    let prevMonthRevenue = 0;

    snap.docs.forEach(doc => {
      const b = doc.data();
      const ci = b.checkInDate?.toDate ? b.checkInDate.toDate() : null;
      const co = b.checkOutDate?.toDate ? b.checkOutDate.toDate() : null;
      const created = b.createdAt?.toDate ? b.createdAt.toDate() : null;
      const total = Number(b.totalAmount)||0;
      // revenue attributed when checked out within month
      const checkedOutAt = b.checkedOutAt?.toDate ? b.checkedOutAt.toDate() : null;
      if (checkedOutAt && checkedOutAt >= start && checkedOutAt <= end) completedRevenue += total;
      // pipeline if active/confirmed overlapping month
      const overlaps = ci && co && (ci <= end && co >= start);
      if (overlaps && (b.status === 'booked' || b.status === 'checked-in' || b.status === 'confirmed')) pipelineRevenue += total;
      // prev month
      if (checkedOutAt && checkedOutAt.getMonth() === (now.getMonth()-1) && checkedOutAt.getFullYear() === now.getFullYear()) prevMonthRevenue += total;
    });

    // naive projection: completed + (pipeline * completion factor by days remaining)
    const day = now.getDate();
    const totalDays = end.getDate();
    const daysRemaining = Math.max(0, totalDays - day);
    const completionFactor = Math.min(1, (day / totalDays) + 0.25); // assume part of pipeline will close
    const projectedRevenue = completedRevenue + pipelineRevenue * completionFactor;

    // Goal: at least 10% above the stronger of prev month or current projection
    const goalBaseline = Math.max(prevMonthRevenue || 0, projectedRevenue || 0, completedRevenue || 0);
    const goal = goalBaseline * 1.1;

    const context = { month, today: now.toISOString().slice(0,10), completedRevenue, pipelineRevenue, projectedRevenue, goal, daysRemaining, prevMonthRevenue };
    const ai = await aiSvc.revenueForecast({ context });
    res.json({ ...context, ...ai, gap: (goal - projectedRevenue) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.overbookingSim = async (req, res) => {
  try {
    const { hotelId, capacity, windowDays = 30 } = req.body;
    if (!hotelId || !capacity) return res.status(400).json({ error: 'Missing hotelId or capacity' });

    // Estimate cancel and no-show rates from history
    const snap = await db.collection('bookings').where('hotelID', '==', hotelId).get();
    let total = 0, cancels = 0, attended = 0, noShows = 0;
    const now = new Date();
    const past = new Date(); past.setDate(now.getDate() - 90);
    snap.docs.forEach(doc => {
      const b = doc.data();
      const ci = b.checkInDate?.toDate ? b.checkInDate.toDate() : null;
      if (!ci || ci < past) return;
      total++;
      if (b.status === 'cancelled') cancels++;
      if (b.status === 'checked-in' || b.status === 'checked-out') attended++;
      // Basic no-show proxy: booked overlapping ci date and never checked-in nor cancelled
      if (b.status === 'booked' && ci < now) noShows++;
    });
    const cancelRate = total ? cancels/total : 0;
    const noShowRate = total ? noShows/total : 0;

    const context = { hotelId, capacity: Number(capacity), windowDays: Number(windowDays), cancelRate, noShowRate };
    const ai = await aiSvc.overbookingSim({ context });
    res.json({ ...context, ...ai });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};


