export interface Coordinates {
  x: number; // 0-100 percentage based for custom vector map
  y: number; // 0-100 percentage based for custom vector map
}

export type DriverStatus = 'available' | 'on_trip' | 'offline';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  rating: number;
  status: DriverStatus;
  coords: Coordinates;
  targetCoords?: Coordinates; // Smooth movement interpolation target
  earnings: number;
  tripsCount: number;
  batteryOrFuel: number; // 0-100 fuel percentage
}

export type CourseStatus = 'pending' | 'assigned' | 'en_route_pickup' | 'on_trip' | 'completed' | 'canceled';

export interface Course {
  id: string;
  passengerName: string;
  passengerPhone: string;
  pickup: string;
  pickupCoords: Coordinates;
  dropoff: string;
  dropoffCoords: Coordinates;
  status: CourseStatus;
  driverId: string | null;
  price: number;
  distance: number; // in km
  duration: number; // in minutes
  createdAt: string;
  scheduledTime: string; // 'immediate' or HH:MM
  passengersCount: number;
  progress: number; // 0 to 100% of the trip
  options: {
    babySeat: boolean;
    vipVehicle: boolean;
    luggage: boolean;
  };
  ticketNumber?: string;
}

export interface EventLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'assign';
  courseId?: string;
  driverId?: string;
}

export interface Neighborhood {
  name: string;
  coords: Coordinates;
  description: string;
}
