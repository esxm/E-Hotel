const bookingService = require("../services/bookingService");

class ServiceBookingController {
  static async createServiceBooking(req, res) {
    try {
      const { hotelId } = req.params;
      const { customerID, serviceID, bookingDate, requiredResources, notes } = req.body;

      const serviceBooking = await bookingService.createServiceBooking({
        hotelId,
        customerID,
        serviceID,
        bookingDate,
        requiredResources,
        notes,
      });

      res.status(201).json(serviceBooking);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async cancelServiceBooking(req, res) {
    try {
      const { hotelId, serviceBookingID } = req.params;
      const { customerID, reason } = req.body;

      const result = await bookingService.cancelServiceBooking({
        hotelId,
        serviceBookingID,
        customerID,
        reason,
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getServiceBookings(req, res) {
    try {
      const { hotelId } = req.params;
      const { customerID } = req.query;

      const serviceBookings = await bookingService.getServiceBookings(hotelId, customerID);
      res.json(serviceBookings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getServiceBookingById(req, res) {
    try {
      const { hotelId, serviceBookingID } = req.params;

      const serviceBookings = await bookingService.getServiceBookings(hotelId);
      const serviceBooking = serviceBookings.find(booking => booking.serviceBookingID === serviceBookingID);

      if (!serviceBooking) {
        return res.status(404).json({ error: "Service booking not found" });
      }

      res.json(serviceBooking);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ServiceBookingController;

