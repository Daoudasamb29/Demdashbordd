import { supabase } from './supabaseClient';
import { Course, Driver, CourseStatus } from './types';
import { initialCourses, initialDrivers } from './initialData';

// --- Mappings between Local App and User's Official SQL Schema ---

// Status mappings for Rides
export function mapLocalStatusToDb(status: CourseStatus): string {
  switch (status) {
    case 'pending': return 'pending';
    case 'assigned': return 'confirmed';
    case 'en_route_pickup': return 'on_the_way';
    case 'on_trip': return 'in_progress';
    case 'completed': return 'completed';
    case 'canceled': return 'cancelled';
    default: return 'pending';
  }
}

export function mapDbStatusToLocal(status: string): CourseStatus {
  switch (status) {
    case 'pending': return 'pending';
    case 'confirmed': return 'assigned';
    case 'on_the_way': return 'en_route_pickup';
    case 'in_progress': return 'on_trip';
    case 'completed': return 'completed';
    case 'cancelled': return 'canceled';
    default: return 'pending';
  }
}

/**
 * 1. Convert row from `rides` table to `Course` object
 */
export function mapRideToCourse(row: any): Course {
  let extra: any = {};
  if (row.payment_method) {
    try {
      extra = JSON.parse(row.payment_method);
    } catch (e) {
      extra = { fallbackMethod: row.payment_method };
    }
  }

  return {
    id: row.id,
    passengerName: row.client_name || 'Passager Anonyme',
    passengerPhone: row.client_phone || '+221 77 000 00 00',
    pickup: row.pickup_location || 'Dakar',
    pickupCoords: {
      x: Number(row.pickup_coords_lat) || 12,
      y: Number(row.pickup_coords_lng) || 70,
    },
    dropoff: row.dropoff_location || 'Touba',
    dropoffCoords: {
      x: Number(row.dropoff_coords_lat) || 88,
      y: Number(row.dropoff_coords_lng) || 40,
    },
    status: mapDbStatusToLocal(row.status),
    driverId: row.driver_id || null,
    price: Number(row.price_fcfa) || 0,
    distance: Number(row.distance_km) || 0,
    duration: Number(row.duration_minutes) || 0,
    createdAt: row.created_time || row.created_at || new Date().toISOString(),
    scheduledTime: row.scheduled_time || 'Immédiat',
    passengersCount: Number(extra.passengersCount) || 1,
    progress: Number(extra.progress) || 0,
    options: extra.options || {
      babySeat: false,
      vipVehicle: false,
      luggage: false,
    },
    ticketNumber: row.ticket_number || extra.ticketNumber || row.id,
  };
}

/**
 * 2. Convert `Course` object to row for `rides` table
 */
export function mapCourseToRide(course: Course): any {
  // Store complementary attributes inside payment_method JSON structure
  const extraPayload = {
    passengersCount: course.passengersCount,
    progress: course.progress,
    options: course.options,
    ticketNumber: course.ticketNumber,
  };

  return {
    id: course.id,
    client_name: course.passengerName,
    client_phone: course.passengerPhone,
    pickup_location: course.pickup,
    pickup_coords_lat: course.pickupCoords.x,
    pickup_coords_lng: course.pickupCoords.y,
    dropoff_location: course.dropoff,
    dropoff_coords_lat: course.dropoffCoords.x,
    dropoff_coords_lng: course.dropoffCoords.y,
    price_fcfa: course.price,
    distance_km: course.distance,
    duration_minutes: course.duration,
    status: mapLocalStatusToDb(course.status),
    driver_id: course.driverId,
    is_scheduled: course.scheduledTime !== 'Immédiat',
    scheduled_time: course.scheduledTime,
    created_time: course.createdAt,
    ticket_number: course.ticketNumber,
    payment_method: JSON.stringify(extraPayload),
    traffic_intensity: 'Modérée',
    updated_at: new Date().toISOString()
  };
}

/**
 * 3. Convert database join Row to local `Driver` object
 */
export function mapRowToDriver(row: any): Driver {
  const hasProfiles = 'profiles' in row && row.profiles !== null && row.profiles !== undefined;
  const rawProfiles = row.profiles;
  const prof = hasProfiles 
    ? (Array.isArray(rawProfiles) ? (rawProfiles[0] || {}) : (rawProfiles || {})) 
    : row;
  let extra: any = {};
  if (prof.seniority) {
    try {
      extra = typeof prof.seniority === 'string' ? JSON.parse(prof.seniority) : prof.seniority;
    } catch (e) {
      extra = { level: prof.seniority };
    }
  }

  // Handle both English and French keys for columns in drivers and profiles tables robustly
  const finalId = row.id || prof.id;
  const finalName = row.name || prof.name || row.nom || prof.nom || 'Chauffeur';
  const finalPhone = row.phone || prof.phone || row.telephone || prof.telephone || '+221 77 000 00 00';
  const finalVehicle = row.vehicle_model || prof.vehicle_model || prof.vehicule_modele || row.vehicule_modele || 'Véhicule standard';
  const finalPlate = row.vehicle_plate || prof.vehicle_plate || prof.vehicule_plaque || row.vehicule_plaque || 'DK-0000-XX';

  return {
    id: finalId,
    name: finalName,
    phone: finalPhone,
    vehicle: finalVehicle,
    plate: finalPlate,
    rating: Number(prof.rating) || Number(row.rating) || 4.9,
    status: (row.status || prof.status || 'offline') as any,
    coords: {
      x: Number(row.current_coords_lat) || Number(prof.current_coords_lat) || 50,
      y: Number(row.current_coords_lng) || Number(prof.current_coords_lng) || 50,
    },
    targetCoords: extra.targetCoords || undefined,
    earnings: Number(prof.wallet_balance_fcfa) || Number(row.wallet_balance_fcfa) || 0,
    tripsCount: Number(prof.trips_count) || Number(row.trips_count) || 0,
    batteryOrFuel: Number(extra.batteryOrFuel) || 82,
  };
}

export const mapProfileToDriver = mapRowToDriver;

// --- Supabase Operations ---

/**
 * Fetch all rides
 */
export async function fetchCourses(): Promise<Course[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur fetch rides:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map(mapRideToCourse);
  } catch (e) {
    console.error(e);
    return [];
  }
}

/**
 * Fetch all drivers with their profile information joined robustly in-memory
 */
export async function fetchDrivers(): Promise<Driver[]> {
  if (!supabase) return [];

  try {
    // We query both tables in parallel and perform a manual left join in-memory
    const [driversRes, profilesRes] = await Promise.all([
      supabase.from('drivers').select('*'),
      supabase.from('profiles').select('*')
    ]);

    if (driversRes.error) {
      console.error('Erreur fetch drivers:', driversRes.error);
      return [];
    }

    const dbDrivers = driversRes.data || [];
    const dbProfiles = profilesRes.data || [];

    const processedDriverIds = new Set<string>();
    const drivers: Driver[] = [];

    // 1. Process all active drivers in the `drivers` table
    for (const drv of dbDrivers) {
      // Find matching profile by profile_id or id
      const prof = dbProfiles.find((p) => p.id === drv.profile_id || p.id === drv.id) || {};
      processedDriverIds.add(drv.id);

      const combinedRow = {
        ...drv,
        profiles: prof
      };
      
      drivers.push(mapRowToDriver(combinedRow));
    }

    // 2. Synthesize entries for any profile with driver role that does not have a real-time table record yet
    for (const prof of dbProfiles) {
      if (processedDriverIds.has(prof.id)) continue;

      // Skip profiles that are verified as admins
      const isRoleAdmin = typeof prof.role === 'string' && prof.role.toLowerCase() === 'admin';
      const isNameAdmin = typeof prof.name === 'string' && prof.name.toLowerCase().includes('admin');
      const isNomAdmin = typeof prof.nom === 'string' && prof.nom.toLowerCase().includes('admin');

      if (isRoleAdmin || isNameAdmin || isNomAdmin) {
        continue;
      }

      // Synthesize a driver entry for them
      const synthesizedRow = {
        id: prof.id,
        profile_id: prof.id,
        name: prof.name || prof.nom,
        phone: prof.phone || prof.telephone,
        vehicle_model: prof.vehicle_model || prof.vehicule_modele,
        vehicle_plate: prof.vehicle_plate || prof.vehicule_plaque,
        status: 'offline', // default to offline until active
        current_zone: 'Dakar',
        current_coords_lat: 42, // default grid center
        current_coords_lng: 35, // default grid center
        profiles: prof
      };

      drivers.push(mapRowToDriver(synthesizedRow));
    }

    return drivers;
  } catch (e) {
    console.error('Erreur fetchDrivers join:', e);
    return [];
  }
}

/**
 * Insert or update a course in `rides`.
 * Registers state revisions inside `ride_history` and `notifications` dynamically for full-scale compliance!
 */
export async function upsertCourse(course: Course, oldStatus?: string): Promise<boolean> {
  if (!supabase) return true;

  try {
    const payload = mapCourseToRide(course);
    const { error } = await supabase
      .from('rides')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Erreur upsertCourse:', error);
      return false;
    }

    // Dynamic insertion of Ride History whenever the state is modified
    if (oldStatus && oldStatus !== course.status) {
      await supabase.from('ride_history').insert({
        id: 'HIST-' + Math.floor(100000 + Math.random() * 900000),
        ride_id: course.id,
        driver_id: course.driverId || null,
        old_status: mapLocalStatusToDb(oldStatus as CourseStatus),
        new_status: mapLocalStatusToDb(course.status),
        changed_by: 'dispatcher',
        created_at: new Date().toISOString()
      });
    }

    // Dynamic driver notifications for critical operational assignments!
    if (course.driverId && course.status === 'assigned' && oldStatus !== 'assigned') {
      await supabase.from('notifications').insert({
        id: 'NOTIF-' + Math.floor(100000 + Math.random() * 900000),
        driver_id: course.driverId,
        ride_id: course.id,
        type: 'assignment',
        title: 'Nouvelle course assignée !',
        body: `Vous avez été assigné à la course #${course.id} de ${course.pickup} à ${course.dropoff}.`,
        is_read: false,
        created_at: new Date().toISOString()
      });
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Persists driver state across both `profiles` and `drivers` table
 */
export async function upsertDriver(driver: Driver): Promise<boolean> {
  if (!supabase) return true;

  try {
    const initials = driver.name.split(' ').map((n) => n[0]).join('');
    
    // Store battery/target properties within the profile seniority parameter safely
    const extraPayload = {
      batteryOrFuel: driver.batteryOrFuel,
      targetCoords: driver.targetCoords,
    };

    // 1. Persist the general static Profile definitions
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: driver.id,
        name: driver.name,
        rating: driver.rating,
        trips_count: driver.tripsCount,
        vehicle_model: driver.vehicle,
        vehicle_plate: driver.plate,
        wallet_balance_fcfa: driver.earnings,
        avatar_initials: initials,
        seniority: JSON.stringify(extraPayload),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Erreur profiles upsert:', profileError);
      return false;
    }

    // 2. Persist real-time active state into the drivers table
    const { error: driverError } = await supabase
      .from('drivers')
      .upsert({
        id: driver.id,
        profile_id: driver.id, // linked foreign key
        name: driver.name,
        phone: driver.phone,
        avatar_initials: initials,
        vehicle_model: driver.vehicle,
        vehicle_plate: driver.plate,
        status: driver.status,
        current_zone: 'Dakar',
        current_coords_lat: driver.coords.x,
        current_coords_lng: driver.coords.y,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (driverError) {
      console.error('Erreur drivers upsert:', driverError);
      return false;
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Delete course from database
 */
export async function deleteCourseInDb(courseId: string): Promise<boolean> {
  if (!supabase) return true;

  try {
    const { error } = await supabase
      .from('rides')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('Erreur de suppression de course:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// --- Seed Initial Data Helpers ---

export async function seedInitialCourses() {
  if (!supabase) return;
  const rides = initialCourses.map(mapCourseToRide);
  const { error } = await supabase.from('rides').insert(rides);
  if (error) console.error('Seeding rides failed:', error);
}

export async function seedInitialDrivers() {
  if (!supabase) return;
  
  // To avoid Foreign Key Constraint violations, write profiles before real-time drivers
  for (const driver of initialDrivers) {
    const initials = driver.name.split(' ').map((n) => n[0]).join('');
    const extraPayload = {
      batteryOrFuel: driver.batteryOrFuel,
    };

    // Insert Profile record first
    await supabase.from('profiles').insert({
      id: driver.id,
      name: driver.name,
      rating: driver.rating,
      trips_count: driver.tripsCount,
      vehicle_model: driver.vehicle,
      vehicle_plate: driver.plate,
      wallet_balance_fcfa: driver.earnings,
      avatar_initials: initials,
      seniority: JSON.stringify(extraPayload),
      updated_at: new Date().toISOString()
    });

    // Insert active Driver record
    await supabase.from('drivers').insert({
      id: driver.id,
      profile_id: driver.id,
      name: driver.name,
      phone: driver.phone,
      avatar_initials: initials,
      vehicle_model: driver.vehicle,
      vehicle_plate: driver.plate,
      status: driver.status,
      current_zone: 'Dakar',
      current_coords_lat: driver.coords.x,
      current_coords_lng: driver.coords.y,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}
