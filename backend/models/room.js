// models/Room.js
/**
 * @class Room
 * @prop {string} roomNumber
 * @prop {string} type           // e.g. "standard", "suite", "presidential"
 * @prop {string} status         // "available", "booked", or "occupied"
 * @prop {string} hotelID
 * @prop {number} pricePerNight  // price per night in the room
 * @prop {number|null} floor
 */
class Room {
  constructor({ roomNumber, type, status, hotelID, pricePerNight, floor = null }) {
    this.roomNumber = roomNumber;
    this.type = type;
    this.status = status;
    this.hotelID = hotelID;
    this.pricePerNight = pricePerNight;
    this.floor = floor;
  }
}

module.exports = Room;
