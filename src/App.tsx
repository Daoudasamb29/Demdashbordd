import React, { useState, useEffect, useRef } from 'react';
import { dakarNeighborhoods, getRouteData, initialCourses, initialDrivers } from './initialData';
import { Course, Driver, EventLog } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import LiveMap from './components/LiveMap';
import CourseList from './components/CourseList';
import DriverList from './components/DriverList';
import CourseForm from './components/CourseForm';
import AnalyticsView from './components/AnalyticsView';
import EventConsole from './components/EventConsole';
import AssignmentModal from './components/AssignmentModal';
import { Sparkles, X, Check, ToggleLeft, Layers, Volume2, VolumeX, Database, Sliders, Globe } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { fetchCourses, fetchDrivers, upsertCourse, upsertDriver, mapRideToCourse, mapProfileToDriver, seedInitialCourses, seedInitialDrivers } from './supabaseService';
import LoginView from './components/LoginView';

export default function App() {
  // Current logged in dispatcher auth state
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; source: 'supabase' | 'local'; id?: string } | null>(() => {
    const saved = localStorage.getItem('jengu_currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLoginSuccess = (user: { email: string; name: string; source: 'supabase' | 'local'; id?: string }) => {
    setCurrentUser(user);
    localStorage.setItem('jengu_currentUser', JSON.stringify(user));
    writeLog(`Utilisateur ${user.name} connecté avec succès (${user.source === 'supabase' ? 'Supabase' : 'Local'}).`, 'success');
  };

  const handleLogout = async () => {
    if (currentUser?.source === 'supabase' && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    localStorage.removeItem('jengu_currentUser');
    writeLog('Utilisateur déconnecté.', 'info');
  };

  // Navigation tabs
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // Right side tab active list on dashboard page
  const [dashboardRightTab, setDashboardRightTab] = useState<'courses' | 'drivers'>('courses');

  // Main State Containers
  const [courses, rawSetCourses] = useState<Course[]>([]);
  const [drivers, rawSetDrivers] = useState<Driver[]>([]);

  // Safe wrapper setters that guarantee unique IDs in arrays (React keys safeguard)
  const setCourses = (val: Course[] | ((prev: Course[]) => Course[])) => {
    rawSetCourses((prev) => {
      const resolved = typeof val === 'function' ? val(prev) : val;
      const seen = new Set<string>();
      return resolved.filter((c) => {
        if (!c || !c.id) return false;
        if (seen.has(c.id)) {
          console.warn(`[DriveOps Unique Guard] Supprimé doublon de course ID: ${c.id}`);
          return false;
        }
        seen.add(c.id);
        return true;
      });
    });
  };

  const setDrivers = (val: Driver[] | ((prev: Driver[]) => Driver[])) => {
    rawSetDrivers((prev) => {
      const resolved = typeof val === 'function' ? val(prev) : val;
      const seen = new Set<string>();
      return resolved.filter((d) => {
        if (!d || !d.id) return false;
        if (seen.has(d.id)) {
          console.warn(`[DriveOps Unique Guard] Supprimé doublon de chauffeur ID: ${d.id}`);
          return false;
        }
        seen.add(d.id);
        return true;
      });
    });
  };
  const [logs, setLogs] = useState<EventLog[]>([
    {
      id: 'init-001',
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      message: 'Système DriveOps v1.2 initialisé - Supervision Transit Inter-Urbain.',
      type: 'info'
    }
  ]);

  // Selected entities highlights on Map/Panels
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Modals & Panels opening toggles
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [courseToAssign, setCourseToAssign] = useState<Course | null>(null);

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(2); // 1x, 2x, 5x, 10x
  const [audioAlerts, setAudioAlerts] = useState<boolean>(false); // browser sounds

  // Ref container for latest state inside interval
  const stateRef = useRef({ courses, drivers, isSimulating, simulationSpeed });
  useEffect(() => {
    stateRef.current = { courses, drivers, isSimulating, simulationSpeed };
  }, [courses, drivers, isSimulating, simulationSpeed]);

  // Supabase Initial Load
  useEffect(() => {
    async function loadData() {
      if (isSupabaseConfigured()) {
        try {
          writeLog('Connexion à Supabase... Chargement des données à jour.', 'info');
          let dbCourses = await fetchCourses();
          let dbDrivers = await fetchDrivers();

          // Auto-seed if database tables are empty
          if (dbDrivers.length === 0) {
            writeLog('Base de données Supabase vide détectée. Lancement de la procédure de seeding des chauffeurs et des trajets...', 'warning');
            await seedInitialDrivers();
            await seedInitialCourses();
            // Re-fetch after seeding
            dbCourses = await fetchCourses();
            dbDrivers = await fetchDrivers();
          }

          setCourses(dbCourses);
          setDrivers(dbDrivers);
          writeLog('Indexation terminée. Base de données synchronisée.', 'success');
        } catch (err) {
          console.error("Erreur d'initialisation de Supabase:", err);
          writeLog('Erreur de connexion Supabase. Utilisation du stockage local.', 'error');
          // Fallback to local sandbox data on error
          setCourses(initialCourses);
          setDrivers(initialDrivers);
        }
      } else {
        // Fallback to local sandbox data when Supabase is not configured
        writeLog('Mode Sandbox Local (Supabase non configuré). Chargement des données de démonstration.', 'info');
        setCourses(initialCourses);
        setDrivers(initialDrivers);
      }
    }
    loadData();
  }, []);

  // Supabase Real-Time Subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const queryRides = supabase
      .channel('realtime_rides_db')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCourse = mapRideToCourse(payload.new);
            setCourses((prev) => {
              if (prev.some((c) => c.id === newCourse.id)) return prev;
              return [newCourse, ...prev];
            });
            writeLog(`Nouvelle course #${newCourse.id} insérée en direct dans Supabase par le réseau !`, 'success', newCourse.id);
            triggerBeep(580, 0.4);
          } else if (payload.eventType === 'UPDATE') {
            const updatedCourse = mapRideToCourse(payload.new);
            
            setCourses((prev) => {
              const currentCourse = prev.find((c) => c.id === updatedCourse.id);
              
              // Si la base de données passe le trajet à 'cancelled' (maps to local 'canceled'),
              // alors que l'application du répartiteur l'avait en statut 'assigned' ou 'en_route_pickup' :
              // C'est un refus/rejet ou une annulation de la part du chauffeur !
              if (
                updatedCourse.status === 'canceled' &&
                currentCourse &&
                ['assigned', 'en_route_pickup'].includes(currentCourse.status)
              ) {
                console.log(`[Supabase Real-Time] Refus/rejet du chauffeur détecté pour #${updatedCourse.id}. Remise en attente automatique...`);
                
                // Exécute handleRejectCourse de façon asynchrone pour libérer le chauffeur dans Supabase,
                // mettre à jour les logs système et appliquer la sauvegarde finale de 'pending'.
                setTimeout(() => {
                  handleRejectCourse(updatedCourse.id);
                }, 50);

                // Retour immédiat d'une prédiction 'pending' pour mettre à jour l'affichage instantanément
                const revertedCourse: Course = { ...currentCourse, status: 'pending', driverId: null, progress: 0 };
                return prev.map((c) => c.id === updatedCourse.id ? revertedCourse : c);
              }

              // Mise à jour de flux classique
              writeLog(`La course #${updatedCourse.id} a été mise à jour en direct ! (Statut: ${updatedCourse.status.toUpperCase()})`, 'info', updatedCourse.id);
              return prev.map((c) => c.id === updatedCourse.id ? updatedCourse : c);
            });
          } else if (payload.eventType === 'DELETE') {
            setCourses((prev) => prev.filter((c) => c.id !== payload.old.id));
            writeLog(`La course #${payload.old.id} a été supprimée ou archivée.`, 'warning');
          }
        }
      )
      .subscribe();

    const queryDrivers = supabase
      .channel('realtime_drivers_db')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedRow = payload.new;
            setDrivers((prev) => {
              const existingDriver = prev.find((d) => d.id === updatedRow.id);
              
              const updatedDriver: Driver = {
                id: updatedRow.id,
                name: updatedRow.name || existingDriver?.name || 'Chauffeur',
                phone: updatedRow.phone || existingDriver?.phone || '+221 77 000 00 00',
                vehicle: updatedRow.vehicle_model || existingDriver?.vehicle || 'Véhicule',
                plate: updatedRow.vehicle_plate || existingDriver?.plate || 'DK-0000-XX',
                rating: existingDriver?.rating ?? 4.9,
                status: (updatedRow.status || 'offline') as any,
                coords: {
                  x: Number(updatedRow.current_coords_lat) || existingDriver?.coords.x || 50,
                  y: Number(updatedRow.current_coords_lng) || existingDriver?.coords.y || 50,
                },
                targetCoords: existingDriver?.targetCoords,
                earnings: existingDriver?.earnings ?? 0,
                tripsCount: existingDriver?.tripsCount ?? 0,
                batteryOrFuel: existingDriver?.batteryOrFuel ?? 80,
              };

              if (existingDriver) {
                return prev.map((d) => d.id === updatedDriver.id ? updatedDriver : d);
              }
              return [...prev, updatedDriver];
            });
            writeLog(`Mise à jour chauffeur: ${updatedRow.name} est désormais ${updatedRow.status.toUpperCase()}.`, 'info', undefined, updatedRow.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(queryRides);
      supabase.removeChannel(queryDrivers);
    };
  }, []);

  // Audio trigger helper
  const triggerBeep = (freq: number, dur: number) => {
    if (!audioAlerts) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {
      // Ignored if browser policy blocks context
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const writeLog = (message: string, type: EventLog['type'], courseId?: string, driverId?: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog: EventLog = {
      id: `EL-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp,
      message,
      type,
      courseId,
      driverId,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const handleCreateCourse = (courseData: Omit<Course, 'id' | 'createdAt' | 'status' | 'driverId' | 'progress'>) => {
    // Generate a highly unique 6-digit number based ID to guarantee zero collision
    const newId = `CR-${Math.floor(100000 + Math.random() * 900000)}`;
    const newCourse: Course = {
      ...courseData,
      id: newId,
      createdAt: new Date().toISOString(),
      status: 'pending',
      driverId: null,
      progress: 0,
    };

    setCourses((prev) => [newCourse, ...prev]);
    writeLog(`Nouvelle course #${newId} demandée par ${courseData.passengerName} (${courseData.pickup} → ${courseData.dropoff}).`, 'success', newId);
    triggerBeep(520, 0.45); // high pitch alert
    
    // Persister dans Supabase
    upsertCourse(newCourse);

    // Highlight created course immediately
    setSelectedCourse(newCourse);
    setDashboardRightTab('courses');
    setCurrentTab('dashboard');
  };

  const handleGenerateRandomCourse = () => {
    // Pools of mock Senegal passengers
    const names = [
      'Awa Diop', 'Cheikh Sall', 'Fatoumata Diallo', 'Ousmane Sy', 'Mariama Niang',
      'Ibrahima Ba', 'Isabelle Durand', 'Moussa Faye', 'Ndeye Sow', 'Jean-Pierre Ndiaye'
    ];
    const phones = [
      '+221 77 410 2030', '+221 76 980 1521', '+221 78 505 1122', '+221 70 330 4050',
      '+221 77 554 4455', '+221 76 210 9988'
    ];

    // Pick random neighborhoods that are different
    let pickIdx = Math.floor(Math.random() * dakarNeighborhoods.length);
    let dropIdx = Math.floor(Math.random() * dakarNeighborhoods.length);
    while (pickIdx === dropIdx) {
      dropIdx = Math.floor(Math.random() * dakarNeighborhoods.length);
    }

    const pickup = dakarNeighborhoods[pickIdx];
    const dropoff = dakarNeighborhoods[dropIdx];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomPhone = phones[Math.floor(Math.random() * phones.length)];
    const passengersCount = Math.floor(Math.random() * 3) + 1;

    // Distance & Base pricing computation on real regional Senegal table
    const route = getRouteData(pickup.name, dropoff.name);
    const dist = route.dist;
    const duration = Math.round(dist * 1.0 + 10); // Intercity driving represents ~1 min per km + buffer

    const vip = Math.random() > 0.7;
    const baby = Math.random() > 0.8;
    const luggage = Math.random() > 0.6;

    let price = route.basePrice;
    if (vip) price += 5000;
    if (baby) price += 1500;
    if (luggage) price += 1000;

    handleCreateCourse({
      passengerName: randomName,
      passengerPhone: randomPhone,
      pickup: pickup.name,
      pickupCoords: pickup.coords,
      dropoff: dropoff.name,
      dropoffCoords: dropoff.coords,
      price,
      distance: dist,
      duration,
      scheduledTime: 'Immédiat',
      passengersCount,
      options: { babySeat: baby, vipVehicle: vip, luggage },
      ticketNumber: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
    });
  };

  const handleAssignDriver = (courseId: string, driverId: string) => {
    const matchedDriver = drivers.find((d) => d.id === driverId);
    const matchedCourse = courses.find((c) => c.id === courseId);

    if (!matchedDriver || !matchedCourse) return;

    const updatedCourse: Course = { ...matchedCourse, status: 'assigned', driverId: driverId, progress: 10 };
    const updatedDriver: Driver = { ...matchedDriver, status: 'on_trip' };

    // Update course attributes
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? updatedCourse
          : c
      )
    );

    // Update driver status
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId ? updatedDriver : d
      )
    );

    // Écrire les changements dans Supabase
    upsertCourse(updatedCourse, matchedCourse.status);
    upsertDriver(updatedDriver);

    writeLog(
      `Course #${courseId} affectée à ${matchedDriver.name}. Le chauffeur rejoint le lieu de départ (${matchedCourse.pickup}).`,
      'assign',
      courseId,
      driverId
    );

    triggerBeep(330, 0.3); // assignment confirmation chime
    setCourseToAssign(null);

    // Auto-select modified course to monitor progress
    setSelectedCourse(updatedCourse);
    setSelectedDriver(updatedDriver);
  };

  const handleCompleteCourse = (courseId: string) => {
    const matchedCourse = courses.find((c) => c.id === courseId);
    if (!matchedCourse) return;

    const matchedDriverId = matchedCourse.driverId;

    const updatedCourse: Course = { ...matchedCourse, status: 'completed', progress: 100 };
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? updatedCourse : c
      )
    );
    upsertCourse(updatedCourse, matchedCourse.status);

    if (matchedDriverId) {
      const matchDriver = drivers.find((d) => d.id === matchedDriverId);
      if (matchDriver) {
        const updatedDriver: Driver = {
          ...matchDriver,
          status: 'available',
          earnings: matchDriver.earnings + matchedCourse.price,
          tripsCount: matchDriver.tripsCount + 1,
        };
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === matchedDriverId
              ? updatedDriver
              : d
          )
        );
        upsertDriver(updatedDriver);

        writeLog(
          `Course #${courseId} cloturée. Passager déposé à destination (${matchedCourse.dropoff}). Gain de ${matchedCourse.price.toLocaleString()} FCFA crédité à ${matchDriver.name}.`,
          'success',
          courseId,
          matchedDriverId
        );
      }
    }

    triggerBeep(440, 0.4);
    setSelectedCourse(null);
  };

  const handleCancelCourse = (courseId: string) => {
    const matchedCourse = courses.find((c) => c.id === courseId);
    if (!matchedCourse) return;

    const matchedDriverId = matchedCourse.driverId;

    const updatedCourse: Course = { ...matchedCourse, status: 'canceled' };
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? updatedCourse : c))
    );
    upsertCourse(updatedCourse, matchedCourse.status);

    if (matchedDriverId) {
      const matchDriver = drivers.find((d) => d.id === matchedDriverId);
      if (matchDriver) {
        const updatedDriver: Driver = { ...matchDriver, status: 'available' };
        setDrivers((prev) =>
          prev.map((d) =>
            d.id === matchedDriverId ? updatedDriver : d
          )
        );
        upsertDriver(updatedDriver);
        
        writeLog(
          `Course #${courseId} annulée par le dispatcher. Chauffeur ${matchDriver.name} de retour en statut Disponible.`,
          'error',
          courseId,
          matchedDriverId
        );
      }
    } else {
      writeLog(
        `Course #${courseId} annulée par le dispatcher.`,
        'error',
        courseId
      );
    }

    triggerBeep(180, 0.5); // low pitch failure beep
    setSelectedCourse(null);
  };

  const handleRejectCourse = (courseId: string) => {
    setCourses((prevCourses) => {
      const matchedCourse = prevCourses.find((c) => c.id === courseId);
      if (!matchedCourse) return prevCourses;

      const matchedDriverId = matchedCourse.driverId;
      const updatedCourse: Course = { ...matchedCourse, status: 'pending', driverId: null, progress: 0 };
      const nextCourses = prevCourses.map((c) => (c.id === courseId ? updatedCourse : c));

      // Asynchronously update Supabase in the background
      upsertCourse(updatedCourse, matchedCourse.status);

      // Now update the driver status to available
      if (matchedDriverId) {
        setDrivers((prevDrivers) => {
          const matchDriver = prevDrivers.find((d) => d.id === matchedDriverId);
          if (matchDriver) {
            const updatedDriver: Driver = { ...matchDriver, status: 'available' };
            upsertDriver(updatedDriver);
            
            writeLog(
              `Le chauffeur ${matchDriver.name} a rejeté la course #${courseId}. La course redevient disponible pour assignation.`,
              'warning',
              courseId,
              matchedDriverId
            );
            
            return prevDrivers.map((d) =>
              d.id === matchedDriverId ? updatedDriver : d
            );
          }
          return prevDrivers;
        });
      } else {
        writeLog(
          `Course #${courseId} rejetée. Retour au statut en attente d'assignation.`,
          'warning',
          courseId
        );
      }

      triggerBeep(260, 0.45); // alert beep
      setSelectedCourse(updatedCourse);
      
      return nextCourses;
    });
  };

  const handleToggleDriverStatus = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id === driverId) {
          const nextStatus = d.status === 'offline' ? 'available' : 'offline';
          const updatedDriver: Driver = { ...d, status: nextStatus };
          
          writeLog(
            `Chauffeur ${d.name} (${d.plate}) est désormais ${
              nextStatus === 'available' ? 'EN SERVICE (Disponible)' : 'HORS SERVICE (Déconnecté)'
            }.`,
            nextStatus === 'available' ? 'success' : 'info',
            undefined,
            driverId
          );
          
          upsertDriver(updatedDriver);
          return updatedDriver;
        }
        return d;
      })
    );
  };

  const handleClearLogs = () => {
    setLogs([]);
    writeLog('Logs nettoyés par le dispatcher.', 'info');
  };

  // ---------------------------------------------------------------------------
  // Real-Time Simulation Interval Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const runSimulationTick = () => {
      const { courses: currentCourses, drivers: currentDrivers, isSimulating: activeSim, simulationSpeed: currentSpeed } = stateRef.current;
      if (!activeSim) return;

      let coursesChanged = false;
      let driversChanged = false;

      // 1. Progress active courses
      const nextCourses = currentCourses.map((c) => {
        if (c.status === 'assigned') {
          // Approach phase: en route to pickup location (increment progress from 10 to 30)
          coursesChanged = true;
          const nextProgress = c.progress + 4 * currentSpeed;
          if (nextProgress >= 30) {
            writeLog(`Chauffeur à la position de départ pour la course #${c.id}. Prise en charge de ${c.passengerName}.`, 'info', c.id, c.driverId || undefined);
            const updated = { ...c, status: 'en_route_pickup' as const, progress: 30 };
            upsertCourse(updated, 'assigned');
            return updated;
          }
          return { ...c, progress: nextProgress };
        }

        if (c.status === 'en_route_pickup') {
          // Pickup boarding transition
          coursesChanged = true;
          const nextProgress = c.progress + 3 * currentSpeed;
          if (nextProgress >= 40) {
            writeLog(`Client embarqué dans le véhicule. Voyage #${c.id} en cours vers ${c.dropoff}.`, 'success', c.id, c.driverId || undefined);
            const updated = { ...c, status: 'on_trip' as const, progress: 40 };
            upsertCourse(updated, 'en_route_pickup');
            return updated;
          }
          return { ...c, progress: nextProgress };
        }

        if (c.status === 'on_trip') {
          // Transit phase: actual trip on route (increment progress up to 100)
          coursesChanged = true;
          const nextProgress = c.progress + (3 * currentSpeed);
          if (nextProgress >= 100) {
            // Automatically complete with delay
            setTimeout(() => {
              handleCompleteCourse(c.id);
            }, 1000);
            return { ...c, progress: 100 };
          }
          return { ...c, progress: Math.min(99, nextProgress) };
        }

        return c;
      });

      // 2. Animate and update Driver GPS Coordinates closer to their targets
      const nextDrivers = currentDrivers.map((d) => {
        // If driver is offline, they do not move
        if (d.status === 'offline') return d;

        // Is this driver doing a course?
        const activeTrip = currentCourses.find((c) => c.driverId === d.id && ['assigned', 'en_route_pickup', 'on_trip'].includes(c.status));

        if (activeTrip) {
          driversChanged = true;
          let targetCoords = activeTrip.pickupCoords; // Heading to pick up

          if (activeTrip.status === 'on_trip') {
            targetCoords = activeTrip.dropoffCoords; // Heading to drop off
          }

          // Move coordinates 4.5% closer to target each tick, multiplied by speed index
          const dx = targetCoords.x - d.coords.x;
          const dy = targetCoords.y - d.coords.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Fuel/Battery drains slowly on trip
          const currentPower = Math.max(1, d.batteryOrFuel - (Math.random() > 0.8 ? 1 : 0));

          if (dist > 1.5) {
            const step = (0.04 * currentSpeed);
            const nextX = Math.round((d.coords.x + dx * step) * 100) / 100;
            const nextY = Math.round((d.coords.y + dy * step) * 100) / 100;
            return { ...d, coords: { x: nextX, y: nextY }, batteryOrFuel: currentPower };
          } else {
            // Arrived at target coords
            return { ...d, coords: targetCoords, batteryOrFuel: currentPower };
          }
        } else {
          // Drivers that are available drift around their neighborhood slightly in standby mode to simulate life!
          if (Math.random() > 0.85) {
            driversChanged = true;
            const driftX = (Math.random() - 0.5) * 4;
            const driftY = (Math.random() - 0.5) * 4;
            const nextX = Math.max(10, Math.min(90, Math.round((d.coords.x + driftX) * 100) / 100));
            const nextY = Math.max(15, Math.min(85, Math.round((d.coords.y + driftY) * 100) / 100));
            return { ...d, coords: { x: nextX, y: nextY } };
          }
        }
        return d;
      });

      // Update state containers safely
      if (coursesChanged) setCourses(nextCourses);
      if (driversChanged) setDrivers(nextDrivers);
    };

    const interval = setInterval(runSimulationTick, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="jengu-app" className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden select-none">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
        }}
        pendingCount={courses.filter((c) => c.status === 'pending').length}
        activeCount={courses.filter((c) => ['on_trip', 'assigned', 'en_route_pickup'].includes(c.status)).length}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Panel space container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top bar header */}
        <Header
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onGenerateRandomCourse={handleGenerateRandomCourse}
        />

        {/* Main display switches area */}
        <div id="tab-outlet-zone" className="flex-1 overflow-hidden relative">
          
          {/* Active TAB: Interactive Dashboard */}
          {currentTab === 'dashboard' && (
            <div className="h-full overflow-y-auto bg-slate-100 flex flex-col">
              <div className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1">
                {/* Stats metrics list view row */}
                <StatsBar courses={courses} drivers={drivers} />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Side: Courses Panel (lg:col-span-7) */}
                  <div className="lg:col-span-7 h-[680px] bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Suivi des Courses Actives</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Affectations et progression en temps réel</p>
                      </div>
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                        {courses.filter(c => c.status !== 'completed' && c.status !== 'canceled').length}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <CourseList
                        courses={courses}
                        drivers={drivers}
                        selectedCourse={selectedCourse}
                        onSelectCourse={setSelectedCourse}
                        onAssignDriverClick={(c) => setCourseToAssign(c)}
                        onCompleteCourse={handleCompleteCourse}
                        onCancelCourse={handleCancelCourse}
                        onRejectCourse={handleRejectCourse}
                      />
                    </div>
                  </div>

                  {/* Right Side: Drivers Panel (lg:col-span-5) */}
                  <div className="lg:col-span-5 h-[680px] bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Chauffeurs Connectés</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Disponibilités et statuts de service</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                        {drivers.filter(d => d.status !== 'offline').length}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <DriverList
                        drivers={drivers}
                        selectedDriver={selectedDriver}
                        onSelectDriver={(driver) => {
                          setSelectedDriver(driver);
                          if (driver) {
                            // Find active course if any to focus too
                            const actCourse = courses.find((c) => c.driverId === driver.id && ['on_trip', 'assigned', 'en_route_pickup'].includes(c.status));
                            if (actCourse) setSelectedCourse(actCourse);
                          }
                        }}
                        onToggleDriverStatus={handleToggleDriverStatus}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active TAB: Dedicated Full Screen Map Supervision */}
          {currentTab === 'map' && (
            <div className="w-full h-full overflow-hidden">
              <LiveMap
                courses={courses}
                drivers={drivers}
                selectedCourse={selectedCourse}
                onSelectCourse={setSelectedCourse}
                selectedDriver={selectedDriver}
                onSelectDriver={setSelectedDriver}
                isSimulating={isSimulating}
                onToggleSimulation={() => {
                  setIsSimulating(!isSimulating);
                  writeLog(`Simulation VTC ${!isSimulating ? 'ACTIVÉE' : 'DÉSACTIVÉE'}.`, !isSimulating ? 'success' : 'info');
                }}
                simulationSpeed={simulationSpeed}
                setSimulationSpeed={setSimulationSpeed}
              />
            </div>
          )}

          {/* Active TAB: Advanced Full Catalog Courses */}
          {currentTab === 'courses' && (
            <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Registre National des courses Jengu_Tech</h3>
                  <p className="text-xs text-slate-400">Carnet complet d'archivage des réservations passées et actives</p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all text-white"
                >
                  Ajouter manuellement
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs font-semibold">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-200 select-none">
                    <tr>
                      <th className="p-4">ID Course</th>
                      <th className="p-4">Passager</th>
                      <th className="p-4">Départ / Arrivée</th>
                      <th className="p-4">Tarif</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4">Chauffeur</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {courses.map((c) => {
                      const driverObj = drivers.find((d) => d.id === c.driverId);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-400">#{c.id}</td>
                          <td className="p-4">
                            <span className="block font-bold text-slate-800">{c.passengerName}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{c.passengerPhone}</span>
                          </td>
                          <td className="p-4 text-xs font-bold">
                            <span className="text-blue-600 font-extrabold">▲</span> {c.pickup} <br />
                            <span className="text-rose-600 font-extrabold">▼</span> {c.dropoff}
                          </td>
                          <td className="p-4 font-mono text-slate-900 font-black">{c.price.toLocaleString()} FCFA</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'completed'
                                ? 'bg-slate-100 text-slate-600'
                                : c.status === 'canceled'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-blue-50 text-blue-600'
                            }`}>
                              {c.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">
                            {driverObj ? `${driverObj.name} (${driverObj.plate})` : 'Non affecté'}
                          </td>
                          <td className="p-4 text-right">
                            {c.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setCourseToAssign(c);
                                  setDashboardRightTab('courses');
                                  setCurrentTab('dashboard');
                                }}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded text-[10px]"
                              >
                                ASSIGNER
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active TAB: Fleet details info */}
          {currentTab === 'drivers' && (
            <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Registre de la Flotte VTC</h3>
                <p className="text-xs text-slate-400">Dossiers administratifs et performances individuelles des chauffeurs Jengu_Tech</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {drivers.map((d) => (
                  <div key={d.id} className="bg-white border select-text border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm uppercase">
                          {d.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{d.name}</h4>
                          <span className="text-[10px] text-slate-400 font-bold block">{d.phone}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                          {d.plate}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="py-2 flex justify-between">
                        <span className="text-slate-400 font-medium">Véhicule</span>
                        <span className="font-bold text-slate-900">{d.vehicle}</span>
                      </div>
                      <div className="py-2 flex justify-between">
                        <span className="text-slate-400 font-medium">Statut de connexion</span>
                        <span className={`font-bold uppercase ${d.status === 'available' ? 'text-emerald-600' : 'text-slate-500'}`}>{d.status}</span>
                      </div>
                      <div className="py-2 flex justify-between font-mono">
                        <span className="text-slate-400 font-sans font-medium">Gains Totaux</span>
                        <span className="font-black text-rose-500">{d.earnings.toLocaleString()} FCFA</span>
                      </div>
                      <div className="py-2 flex justify-between font-mono">
                        <span className="text-slate-400 font-sans font-medium">Courses validées</span>
                        <span className="font-black text-slate-800">{d.tripsCount}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleDriverStatus(d.id)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-700 rounded-xl text-xs transition-colors"
                    >
                      Modifier service
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active TAB: Analytics charts */}
          {currentTab === 'analytics' && (
            <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
              <AnalyticsView courses={courses} drivers={drivers} />
            </div>
          )}

          {/* Active TAB: Events audit console logs */}
          {currentTab === 'events' && (
            <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
              <EventConsole logs={logs} onClearLogs={handleClearLogs} />
            </div>
          )}

          {/* Active TAB: Control settings panel */}
          {currentTab === 'settings' && (
            <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto space-y-6 text-left">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Sliders className="w-4.5 h-4.5 text-blue-600" />
                  <span>Configuration du Simulateur DriveOps</span>
                </h3>

                <div className="space-y-4 text-xs font-semibold">
                  {/* Alert Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-800">Alertes Sonores Synthesizer (Web Audio API)</h4>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">Émettre un signal sonore lors des événements clés de dispatching</p>
                    </div>
                    <button
                      onClick={() => {
                        setAudioAlerts(!audioAlerts);
                        triggerBeep(440, 0.2);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase cursor-pointer ${
                        audioAlerts ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {audioAlerts ? 'Actif' : 'Inactif'}
                    </button>
                  </div>

                  {/* Speed Regulator */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800">Cadence Temporelle de Simulation</h4>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">Accélérer les temps de transit et les approches GPS</p>
                      </div>
                      <span className="font-mono font-black text-blue-600">{simulationSpeed}x</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 5, 10].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setSimulationSpeed(speed)}
                          className={`flex-1 py-1.5 border rounded-lg font-mono font-bold text-xs ${
                            simulationSpeed === speed
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sync datasets with Supabase */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800">Actualiser les données</h4>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">Recharger et synchroniser la liste à jour à partir de Supabase</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (isSupabaseConfigured()) {
                          writeLog('Rechargement des données depuis Supabase...', 'info');
                          try {
                            const [dbCourses, dbDrivers] = await Promise.all([
                              fetchCourses(),
                              fetchDrivers()
                            ]);
                            setCourses(dbCourses);
                            setDrivers(dbDrivers);
                            writeLog('Données synchronisées avec succès !', 'success');
                          } catch (err) {
                            writeLog('Erreur lors du rechargement des données.', 'error');
                          }
                        } else {
                          writeLog('Supabase non configuré pour la synchronisation.', 'error');
                        }
                        triggerBeep(400, 0.3);
                      }}
                      className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[10px] uppercase transition-all"
                    >
                      Actualiser
                    </button>
                  </div>
                </div>
              </div>

              {/* Company Profile information summary */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2 text-white">
                  <Globe className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Jengu_Tech - Profil d'entreprise VTC</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Territoire de couverture</span>
                    <strong className="text-white">Dakar Métropole</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Catégories de service</span>
                    <strong className="text-white">Standard, Berline VIP, SUV</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Statut des API de routage</span>
                    <strong className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Opérationnel
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Certificat SSL</span>
                    <strong className="text-indigo-400">Actif (AES-256)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL overlay: Create course manual ticket */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in select-none">
          <div className="max-w-lg w-full">
            <CourseForm
              onCreateCourse={handleCreateCourse}
              onClose={() => setIsCreateModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL overlay: Assign Driver matcher */}
      {courseToAssign && (
        <AssignmentModal
          course={courseToAssign}
          drivers={drivers}
          onAssign={(cId, dId) => handleAssignDriver(cId, dId)}
          onClose={() => setCourseToAssign(null)}
        />
      )}
    </div>
  );
}
