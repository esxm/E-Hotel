const { db, admin } = require("../firebase");
const ServiceResource = require("../models/serviceResource");
const HotelServiceCapacity = require("../models/hotelServiceCapacity");
const Service = require("../models/service");

const serviceResourcesCol = db.collection("serviceResources");
const hotelServiceCapacityCol = db.collection("hotelServiceCapacity");
const servicesCol = db.collection("services");

class ServiceResourceService {
  // Service Resource Management
  async createServiceResource(resourceData) {
    try {
      const docRef = await serviceResourcesCol.add({
        ...resourceData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const doc = await docRef.get();
      return new ServiceResource({ resourceID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error creating service resource: ${error.message}`);
    }
  }

  async getServiceResources(serviceID) {
    try {
      const snapshot = await serviceResourcesCol
        .where("serviceID", "==", serviceID)
        .get();
      
      return snapshot.docs.map(doc => 
        new ServiceResource({ resourceID: doc.id, ...doc.data() })
      );
    } catch (error) {
      throw new Error(`Error fetching service resources: ${error.message}`);
    }
  }

  async updateServiceResource(resourceID, updateData) {
    try {
      await serviceResourcesCol.doc(resourceID).update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const doc = await serviceResourcesCol.doc(resourceID).get();
      return new ServiceResource({ resourceID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error updating service resource: ${error.message}`);
    }
  }

  async deleteServiceResource(resourceID) {
    try {
      await serviceResourcesCol.doc(resourceID).delete();
      return { message: "Service resource deleted successfully" };
    } catch (error) {
      throw new Error(`Error deleting service resource: ${error.message}`);
    }
  }

  // Hotel Service Capacity Management
  async createHotelServiceCapacity(capacityData) {
    try {
      const docRef = await hotelServiceCapacityCol.add({
        ...capacityData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const doc = await docRef.get();
      return new HotelServiceCapacity({ capacityID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error creating hotel service capacity: ${error.message}`);
    }
  }

  async getHotelServiceCapacity(hotelID, serviceID) {
    try {
      const snapshot = await hotelServiceCapacityCol
        .where("hotelID", "==", hotelID)
        .where("serviceID", "==", serviceID)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return new HotelServiceCapacity({ capacityID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error fetching hotel service capacity: ${error.message}`);
    }
  }

  async getAllHotelServiceCapacities(hotelID) {
    try {
      const snapshot = await hotelServiceCapacityCol
        .where("hotelID", "==", hotelID)
        .get();
      
      return snapshot.docs.map(doc => 
        new HotelServiceCapacity({ capacityID: doc.id, ...doc.data() })
      );
    } catch (error) {
      throw new Error(`Error fetching hotel service capacities: ${error.message}`);
    }
  }

  async updateHotelServiceCapacity(capacityID, updateData) {
    try {
      await hotelServiceCapacityCol.doc(capacityID).update({
        ...updateData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      const doc = await hotelServiceCapacityCol.doc(capacityID).get();
      return new HotelServiceCapacity({ capacityID: doc.id, ...doc.data() });
    } catch (error) {
      throw new Error(`Error updating hotel service capacity: ${error.message}`);
    }
  }

  // Capacity Checking and Resource Management
  async checkServiceCapacity(hotelID, serviceID, requiredResources = {}) {
    try {
      // Get the service to understand its resource requirements
      const serviceDoc = await servicesCol.doc(serviceID).get();
      if (!serviceDoc.exists) {
        throw new Error("Service not found");
      }
      
      const service = new Service({ serviceID: serviceDoc.id, ...serviceDoc.data() });
      
      // Get the hotel's capacity for this service
      const capacity = await this.getHotelServiceCapacity(hotelID, serviceID);
      if (!capacity) {
        return {
          hasCapacity: false,
          missingResources: [],
          message: "Service not available at this hotel"
        };
      }

      // Merge service requirements with provided requirements
      const allRequiredResources = { ...service.resourceRequirements, ...requiredResources };
      
      return capacity.checkCapacity(allRequiredResources);
    } catch (error) {
      throw new Error(`Error checking service capacity: ${error.message}`);
    }
  }

  async reserveServiceResources(hotelID, serviceID, requiredResources = {}) {
    try {
      const capacity = await this.getHotelServiceCapacity(hotelID, serviceID);
      if (!capacity) {
        throw new Error("Service not available at this hotel");
      }

      // Get the service to understand its resource requirements
      const serviceDoc = await servicesCol.doc(serviceID).get();
      if (!serviceDoc.exists) {
        throw new Error("Service not found");
      }
      
      const service = new Service({ serviceID: serviceDoc.id, ...serviceDoc.data() });
      
      // Merge service requirements with provided requirements
      const allRequiredResources = { ...service.resourceRequirements, ...requiredResources };
      
      const success = capacity.reserveResources(allRequiredResources);
      
      if (success) {
        // Update the capacity in the database
        await this.updateHotelServiceCapacity(capacity.capacityID, {
          resources: capacity.resources,
          currentBookings: capacity.currentBookings,
        });
      }
      
      return success;
    } catch (error) {
      throw new Error(`Error reserving service resources: ${error.message}`);
    }
  }

  async releaseServiceResources(hotelID, serviceID, requiredResources = {}) {
    try {
      const capacity = await this.getHotelServiceCapacity(hotelID, serviceID);
      if (!capacity) {
        throw new Error("Service not available at this hotel");
      }

      // Get the service to understand its resource requirements
      const serviceDoc = await servicesCol.doc(serviceID).get();
      if (!serviceDoc.exists) {
        throw new Error("Service not found");
      }
      
      const service = new Service({ serviceID: serviceDoc.id, ...serviceDoc.data() });
      
      // Merge service requirements with provided requirements
      const allRequiredResources = { ...service.resourceRequirements, ...requiredResources };
      
      capacity.releaseResources(allRequiredResources);
      
      // Update the capacity in the database
      await this.updateHotelServiceCapacity(capacity.capacityID, {
        resources: capacity.resources,
        currentBookings: capacity.currentBookings,
      });
      
      return true;
    } catch (error) {
      throw new Error(`Error releasing service resources: ${error.message}`);
    }
  }

  // Dashboard and Analytics
  async getHotelServiceAnalytics(hotelID) {
    try {
      const capacities = await this.getAllHotelServiceCapacities(hotelID);
      const analytics = [];

      for (const capacity of capacities) {
        const serviceDoc = await servicesCol.doc(capacity.serviceID).get();
        if (serviceDoc.exists) {
          const service = new Service({ serviceID: serviceDoc.id, ...serviceDoc.data() });
          
          const utilizationRate = capacity.maxConcurrentBookings > 0 
            ? (capacity.currentBookings / capacity.maxConcurrentBookings) * 100 
            : 0;

          analytics.push({
            serviceID: capacity.serviceID,
            serviceName: service.name,
            category: service.category,
            currentBookings: capacity.currentBookings,
            maxConcurrentBookings: capacity.maxConcurrentBookings,
            utilizationRate: Math.round(utilizationRate * 100) / 100,
            isAvailable: capacity.isAvailable,
            resources: capacity.resources,
            availabilityNotes: capacity.availabilityNotes,
            lastUpdated: capacity.lastUpdated
          });
        }
      }

      return analytics;
    } catch (error) {
      throw new Error(`Error fetching hotel service analytics: ${error.message}`);
    }
  }

  async getLowCapacityAlerts(hotelID, threshold = 0.8) {
    try {
      const analytics = await this.getHotelServiceAnalytics(hotelID);
      return analytics.filter(service => 
        service.utilizationRate >= threshold * 100 || 
        !service.isAvailable
      );
    } catch (error) {
      throw new Error(`Error fetching low capacity alerts: ${error.message}`);
    }
  }
}

module.exports = new ServiceResourceService();

