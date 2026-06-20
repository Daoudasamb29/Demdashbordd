import { Driver, Course, Neighborhood, EventLog } from './types';

export const dakarNeighborhoods: Neighborhood[] = [
  { name: 'Dakar', coords: { x: 12, y: 70 }, description: 'Capitale économique du Sénégal, point de départ historique de la presqu\'île' },
  { name: 'AIBD', coords: { x: 38, y: 64 }, description: 'Aéroport International Blaise Diagne de Diass, hub aérien mondial' },
  { name: 'Thiès', coords: { x: 55, y: 50 }, description: 'La cité du rail, carrefour stratégique vers le nord et l\'est' },
  { name: 'Tivaouane', coords: { x: 64, y: 32 }, description: 'Ville sainte d\'enseignement et de culture' },
  { name: 'Touba', coords: { x: 88, y: 40 }, description: 'Grande métropole religieuse et commerciale de l\'est' }
];

export function getRouteData(p1: string, p2: string) {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const n1 = norm(p1);
  const n2 = norm(p2);
  const key = [n1, n2].sort().join('-');
  
  const table: Record<string, { dist: number, basePrice: number }> = {
    'aibd-dakar': { dist: 55, basePrice: 15000 },
    'dakar-thies': { dist: 70, basePrice: 3500 },
    'dakar-tivaouane': { dist: 92, basePrice: 6000 },
    'dakar-touba': { dist: 194, basePrice: 7000 },
    'aibd-thies': { dist: 30, basePrice: 10000 },
    'aibd-tivaouane': { dist: 62, basePrice: 18000 },
    'aibd-touba': { dist: 165, basePrice: 40000 },
    'thies-touba': { dist: 145, basePrice: 35000 },
    'thies-tivaouane': { dist: 25, basePrice: 8000 },
    'tivaouane-touba': { dist: 150, basePrice: 37000 }
  };
  
  return table[key] || { dist: 10, basePrice: 5000 };
}

export const initialDrivers: Driver[] = [
  {
    id: 'D-101',
    name: 'Moussa Barry',
    phone: '+221 77 501 2345',
    vehicle: 'Toyota Camry Hybrid (Berline)',
    plate: 'DK-2489-AD',
    rating: 4.9,
    status: 'available',
    coords: { x: 14, y: 68 }, // Près de Dakar
    earnings: 120000,
    tripsCount: 14,
    batteryOrFuel: 88,
  },
  {
    id: 'D-102',
    name: 'Aminata Diallo',
    phone: '+221 78 120 9876',
    vehicle: 'Hyundai Elantra (Confort)',
    plate: 'DK-9812-BF',
    rating: 4.8,
    status: 'available',
    coords: { x: 36, y: 65 }, // Près d'AIBD
    earnings: 85000,
    tripsCount: 9,
    batteryOrFuel: 64,
  },
  {
    id: 'D-103',
    name: 'Seydou Kane',
    phone: '+221 70 854 3110',
    vehicle: 'Peugeot 508 (Premium VIP)',
    plate: 'DK-0077-AA',
    rating: 5.0,
    status: 'on_trip',
    coords: { x: 55, y: 50 }, // Près de Thiès
    earnings: 215000,
    tripsCount: 19,
    batteryOrFuel: 95,
  },
  {
    id: 'D-104',
    name: 'Fatou Ndiaye',
    phone: '+221 77 659 0088',
    vehicle: 'Kia Sportage (SUV)',
    plate: 'DK-4103-CG',
    rating: 4.7,
    status: 'available',
    coords: { x: 62, y: 34 }, // Près de Tivaouane
    earnings: 62000,
    tripsCount: 7,
    batteryOrFuel: 42,
  },
  {
    id: 'D-105',
    name: 'Ibrahima Sall',
    phone: '+221 76 331 4422',
    vehicle: 'Citroën C4 (Standard)',
    plate: 'DK-8341-EB',
    rating: 4.6,
    status: 'offline',
    coords: { x: 85, y: 42 }, // Touba
    earnings: 35000,
    tripsCount: 4,
    batteryOrFuel: 15,
  },
  {
    id: 'D-106',
    name: 'Cheikh Diop',
    phone: '+221 77 404 8899',
    vehicle: 'Toyota RAV4 (SUV Explorer)',
    plate: 'DK-7712-FG',
    rating: 4.9,
    status: 'available',
    coords: { x: 12, y: 70 }, // Dakar
    earnings: 150000,
    tripsCount: 16,
    batteryOrFuel: 72,
  }
];

export const initialCourses: Course[] = [
  {
    id: 'CR-8201',
    passengerName: 'Mamadou Touré',
    passengerPhone: '+221 70 200 4567',
    pickup: 'Dakar',
    pickupCoords: { x: 12, y: 70 },
    dropoff: 'Touba',
    dropoffCoords: { x: 88, y: 40 },
    status: 'pending',
    driverId: null,
    price: 13000, // FCFA (7000 base + 5000 VIP + 1000 luggage)
    distance: 194,
    duration: 140,
    createdAt: '2026-06-06T16:00:00Z',
    scheduledTime: 'Immédiat',
    passengersCount: 2,
    progress: 0,
    options: {
      babySeat: false,
      vipVehicle: true,
      luggage: true
    },
    ticketNumber: 'TK-9081'
  },
  {
    id: 'CR-8202',
    passengerName: 'Sophie Dubois',
    passengerPhone: '+33 6 1234 5678',
    pickup: 'Dakar',
    pickupCoords: { x: 12, y: 70 },
    dropoff: 'AIBD',
    dropoffCoords: { x: 38, y: 64 },
    status: 'on_trip',
    driverId: 'D-103', // Seydou Kane
    price: 15000, // FCFA
    distance: 55,
    duration: 45,
    createdAt: '2026-06-06T16:10:00Z',
    scheduledTime: 'Immédiat',
    passengersCount: 1,
    progress: 45,
    options: {
      babySeat: false,
      vipVehicle: false,
      luggage: false
    },
    ticketNumber: 'TK-4210'
  },
  {
    id: 'CR-8203',
    passengerName: 'Abdoulaye Sow',
    passengerPhone: '+221 77 912 3456',
    pickup: 'Thiès',
    pickupCoords: { x: 55, y: 50 },
    dropoff: 'Dakar',
    dropoffCoords: { x: 12, y: 70 },
    status: 'pending',
    driverId: null,
    price: 6000, // FCFA (3500 base + 1500 baby seat + 1000 luggage)
    distance: 70,
    duration: 50,
    createdAt: '2026-06-06T16:20:00Z',
    scheduledTime: 'Immédiat',
    passengersCount: 1,
    progress: 0,
    options: {
      babySeat: true,
      vipVehicle: false,
      luggage: true
    },
    ticketNumber: 'TK-7603'
  },
  {
    id: 'CR-8204',
    passengerName: 'Mariama Ba',
    passengerPhone: '+221 77 344 5566',
    pickup: 'Tivaouane',
    pickupCoords: { x: 64, y: 32 },
    dropoff: 'Dakar',
    dropoffCoords: { x: 12, y: 70 },
    status: 'assigned',
    driverId: 'D-102', // Aminata Diallo
    price: 6000, // FCFA (6000 base)
    distance: 92,
    duration: 65,
    createdAt: '2026-06-06T16:25:00Z',
    scheduledTime: 'Immédiat',
    passengersCount: 3,
    progress: 10,
    options: {
      babySeat: false,
      vipVehicle: false,
      luggage: false
    },
    ticketNumber: 'TK-3341'
  }
];

export const initialEventLogs: EventLog[] = [
  {
    id: 'EL-001',
    timestamp: '16:00:12',
    message: 'Système DriveOps v1.2 initialisé - Supervision Transit Inter-Urbain.',
    type: 'info'
  },
  {
    id: 'EL-002',
    timestamp: '16:10:45',
    message: 'Course #CR-8202 créée par Sophie Dubois (Dakar → AIBD).',
    type: 'success'
  },
  {
    id: 'EL-003',
    timestamp: '16:11:15',
    message: 'Course #CR-8202 assignée au chauffeur Seydou K.',
    type: 'assign',
    courseId: 'CR-8202',
    driverId: 'D-103'
  },
  {
    id: 'EL-004',
    timestamp: '16:15:30',
    message: 'Passager pris en charge pour la course #CR-8202 (En route pour AIBD).',
    type: 'success',
    courseId: 'CR-8202'
  },
  {
    id: 'EL-005',
    timestamp: '16:25:20',
    message: 'Nouvelle demande en attente #CR-8204 de Mariama Ba (Tivaouane).',
    type: 'warning'
  }
];
