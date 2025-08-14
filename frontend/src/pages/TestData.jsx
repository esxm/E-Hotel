import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { serviceResourceApi } from '../lib/serviceResourceApi';

const TestData = () => {
  const { user, role } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [services, setServices] = useState([]);
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadTestData();
    }
  }, [user]);

  const loadTestData = async () => {
    try {
      setLoading(true);
      
      // Test basic hotel data
      const hotelsRes = await api.get('/hotels');
      setHotels(hotelsRes.data);
      console.log('Hotels:', hotelsRes.data);

      // Test services data
      const servicesRes = await api.get('/services');
      setServices(servicesRes.data);
      console.log('Services:', servicesRes.data);

      // Test service capacities for first hotel
      if (hotelsRes.data.length > 0) {
        const firstHotel = hotelsRes.data[0];
        try {
          const capacitiesRes = await serviceResourceApi.getAllHotelServiceCapacities(firstHotel.hotelID);
          setCapacities(capacitiesRes.data);
          console.log('Capacities for first hotel:', capacitiesRes.data);
        } catch (error) {
          console.error('Error loading capacities:', error);
        }
      }

    } catch (error) {
      console.error('Error loading test data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-4">Please log in to test data</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Data Test Page</h1>
      
      <div className="mb-4">
        <p><strong>User:</strong> {user.email}</p>
        <p><strong>Role:</strong> {role}</p>
      </div>

      <button 
        onClick={loadTestData}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'Loading...' : 'Load Test Data'}
      </button>

      <div className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Hotels ({hotels.length})</h2>
          <div className="bg-gray-100 p-2 rounded">
            {hotels.map(hotel => (
              <div key={hotel.hotelID} className="mb-2">
                <strong>{hotel.name}</strong> (ID: {hotel.hotelID})
                <br />
                Services: {hotel.availableServiceIDs?.length || 0}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Services ({services.length})</h2>
          <div className="bg-gray-100 p-2 rounded">
            {services.map(service => (
              <div key={service.serviceID} className="mb-2">
                <strong>{service.name}</strong> (ID: {service.serviceID})
                <br />
                Category: {service.category} | Duration: {service.estimatedDuration}min
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Service Capacities ({capacities.length})</h2>
          <div className="bg-gray-100 p-2 rounded">
            {capacities.map(capacity => (
              <div key={capacity.capacityID} className="mb-2">
                <strong>Capacity ID:</strong> {capacity.capacityID}
                <br />
                <strong>Hotel ID:</strong> {capacity.hotelID}
                <br />
                <strong>Service ID:</strong> {capacity.serviceID}
                <br />
                <strong>Max Bookings:</strong> {capacity.maxConcurrentBookings}
                <br />
                <strong>Current Bookings:</strong> {capacity.currentBookings}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestData;

