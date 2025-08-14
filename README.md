# E-Hotel Management System

A comprehensive hotel management system with advanced service resource management capabilities.

## Features

### Core Hotel Management
- Hotel registration and management
- Room booking and availability tracking
- Customer management and profiles
- Payment processing and invoicing
- Staff management (Managers, Receptionists)

### Advanced Service Resource Management 🆕
- **Real-time capacity tracking** for hotel services
- **Resource allocation and monitoring** (staff, equipment, space)
- **Service booking with capacity validation**
- **Automated resource reservation and release**
- **Capacity analytics and alerts**
- **Service availability management**

## Service Resource Management System

The E-Hotel system now includes a sophisticated resource management system that allows hotels to:

### 1. Track Service Resources
- **Staff Resources**: Kitchen staff, lifeguards, spa therapists, etc.
- **Equipment Resources**: Gym equipment, laundry machines, network bandwidth
- **Space Resources**: Dining areas, treatment rooms, parking spaces
- **Material Resources**: Supplies and consumables

### 2. Monitor Service Capacity
- Real-time tracking of current vs. maximum capacity
- Utilization rate calculations
- Capacity alerts when thresholds are exceeded
- Service availability status management

### 3. Manage Service Bookings
- Capacity checking before booking confirmation
- Automatic resource reservation upon booking
- Resource release upon booking cancellation
- Refund processing with cancellation policies

### 4. Analytics and Reporting
- Service utilization analytics
- Resource allocation reports
- Capacity trend analysis
- Low capacity alerts

## API Endpoints

### Service Resource Management
```
POST   /service-resources/resources                    # Create service resource
GET    /service-resources/services/:serviceID/resources # Get service resources
PUT    /service-resources/resources/:resourceID        # Update service resource
DELETE /service-resources/resources/:resourceID        # Delete service resource
```

### Hotel Service Capacity
```
POST   /service-resources/hotels/:hotelID/capacities   # Create hotel service capacity
GET    /service-resources/hotels/:hotelID/capacities   # Get all hotel capacities
GET    /service-resources/hotels/:hotelID/services/:serviceID/capacity # Get specific capacity
PUT    /service-resources/capacities/:capacityID       # Update capacity
```

### Capacity Checking
```
POST   /service-resources/hotels/:hotelID/services/:serviceID/check-capacity # Check availability
POST   /service-resources/hotels/:hotelID/services/:serviceID/reserve        # Reserve resources
POST   /service-resources/hotels/:hotelID/services/:serviceID/release        # Release resources
```

### Analytics
```
GET    /service-resources/hotels/:hotelID/analytics    # Get service analytics
GET    /service-resources/hotels/:hotelID/alerts       # Get capacity alerts
```

### Service Bookings
```
POST   /service-bookings/hotels/:hotelId/service-bookings     # Create service booking
GET    /service-bookings/hotels/:hotelId/service-bookings     # Get service bookings
GET    /service-bookings/hotels/:hotelId/service-bookings/:id # Get specific booking
POST   /service-bookings/hotels/:hotelId/service-bookings/:id/cancel # Cancel booking
```

## Data Models

### ServiceResource
```javascript
{
  resourceID: string,
  serviceID: string,
  resourceName: string,
  resourceType: "staff" | "equipment" | "space" | "material",
  requiredQuantity: number,
  unit: string,
  description: string,
  isPerBooking: boolean,
  maxConcurrentUsage: number
}
```

### HotelServiceCapacity
```javascript
{
  capacityID: string,
  hotelID: string,
  serviceID: string,
  resources: { [resourceID]: number },
  maxConcurrentBookings: number,
  currentBookings: number,
  isAvailable: boolean,
  availabilityNotes: string,
  lastUpdated: Date
}
```

### Service (Enhanced)
```javascript
{
  serviceID: string,
  name: string,
  cost: number,
  isOneTime: boolean,
  description: string,
  resourceRequirements: { [resourceID]: number },
  estimatedDuration: number,
  category: string,
  requiresBooking: boolean
}
```

## Frontend Components

### ServiceCapacityDashboard
- Real-time capacity monitoring
- Resource allocation management
- Capacity alerts and notifications
- Utilization analytics visualization

### ServiceBooking
- Service selection with capacity checking
- Real-time availability validation
- Booking confirmation with resource reservation
- Special requests and notes

## Setup and Installation

### Prerequisites
- Node.js (v16 or higher)
- Firebase project with Firestore
- React development environment

### Backend Setup
```bash
cd backend
npm install
cp env.example .env
# Configure Firebase credentials in .env
npm run seed  # Initialize with sample data including service resources
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
cp env.example .env
# Configure API endpoints in .env
npm run dev
```

## Sample Data

The system includes comprehensive sample data for:

### Services
- WiFi, Breakfast, Pool Access, Spa, Parking
- Room Service, Gym Access, Laundry

### Service Resources
- Staff resources (kitchen staff, lifeguards, therapists)
- Equipment resources (gym equipment, laundry machines)
- Space resources (dining areas, treatment rooms, parking)

### Hotel Capacities
- Dynamic capacity allocation based on hotel size
- Resource availability tracking
- Utilization monitoring

## Usage Examples

### 1. Check Service Capacity
```javascript
const capacityCheck = await api.post(
  `/service-resources/hotels/${hotelId}/services/${serviceId}/check-capacity`
);
```

### 2. Book Service with Resource Management
```javascript
const booking = await api.post(`/service-bookings/hotels/${hotelId}/service-bookings`, {
  customerID: user.uid,
  serviceID: serviceId,
  bookingDate: "2024-01-15T10:00:00",
  notes: "Special dietary requirements"
});
```

### 3. Get Service Analytics
```javascript
const analytics = await api.get(`/service-resources/hotels/${hotelId}/analytics`);
```

## Security and Access Control

- Role-based access control for resource management
- Hotel managers can manage their hotel's service capacities
- Receptionists can view capacity information and manage bookings
- Customers can book services with real-time availability checking

## Monitoring and Alerts

The system provides:
- Real-time capacity monitoring
- Utilization rate tracking
- Automated alerts for low capacity
- Resource allocation optimization suggestions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
