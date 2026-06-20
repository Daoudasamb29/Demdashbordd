import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RefreshCw, Layers } from 'lucide-react';
import { Course, Driver, Neighborhood } from '../types';
import { dakarNeighborhoods } from '../initialData';

// Custom calibrate translation: percentage (0-100) local space to Senegal GPS space
const getLatLng = (x: number, y: number): [number, number] => {
  // If GPS like, use directly
  if (x > 12 && x < 17 && y > -18 && y < -12) {
    return [x, y];
  }
  if (y > 12 && y < 17 && x > -18 && x < -12) {
    return [y, x];
  }
  
  // Projection logic
  const lng = -17.72 + (x * 2.1) / 100;
  const lat = 15.20 - (y * 0.78) / 100;
  return [lat, lng];
};

interface LiveMapProps {
  courses: Course[];
  drivers: Driver[];
  selectedCourse: Course | null;
  onSelectCourse: (course: Course | null) => void;
  selectedDriver: Driver | null;
  onSelectDriver: (driver: Driver | null) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
}

export default function LiveMap({
  courses,
  drivers,
  selectedCourse,
  onSelectCourse,
  selectedDriver,
  onSelectDriver,
  isSimulating,
  onToggleSimulation,
  simulationSpeed,
  setSimulationSpeed,
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  const [showRoads, setShowRoads] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [baseMapType, setBaseMapType] = useState<'dark' | 'traffic'>('traffic');

  const activeDrivers = drivers.filter(d => d.status !== 'offline');

  // 1. Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on region spanning Dakar-Touba
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([14.78, -16.85], 9);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    // Call invalidate size multiple times on layout transition to ensure correct rendering
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
    setTimeout(() => {
      map.invalidateSize();
    }, 1200);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 1.5 Real-time Google Traffic is loaded dynamically on top or as base
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    let newTileLayer: L.TileLayer;
    if (baseMapType === 'traffic') {
      // Direct real-time traffic view provided by Google Maps API servers
      newTileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&hl=fr&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: 'Map data © Google'
      });
    } else {
      // Beautiful slate-900 matching tilemap (CartoDB Dark Matter)
      newTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors, © CartoDB'
      });
    }

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [baseMapType]);

  // 2. Center map on selection
  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedDriver) {
      const [lat, lng] = getLatLng(selectedDriver.coords.x, selectedDriver.coords.y);
      mapRef.current.setView([lat, lng], 11, { animate: true });
    }
  }, [selectedDriver?.id]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedCourse) {
      const [lat, lng] = getLatLng(selectedCourse.pickupCoords.x, selectedCourse.pickupCoords.y);
      mapRef.current.setView([lat, lng], 10, { animate: true });
    }
  }, [selectedCourse?.id]);

  // 3. Redraw content dynamically on updates
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 3.0 Real-time Traffic/Course Heatmap Layer
    if (showHeatmap) {
      dakarNeighborhoods.forEach((n) => {
        const [lat, lng] = getLatLng(n.coords.x, n.coords.y);
        
        // Count active courses involving this neighborhood (pickup or dropoff)
        const activeInNeighborhood = courses.filter((c) => {
          const isRelevant = c.pickup.toLowerCase().trim() === n.name.toLowerCase().trim() ||
                             c.dropoff.toLowerCase().trim() === n.name.toLowerCase().trim();
          const isActive = c.status !== 'completed' && c.status !== 'canceled';
          return isRelevant && isActive;
        });

        const densityCount = activeInNeighborhood.length;

        // Base radius is 6000 meters, increasing by 5000 meters per active course
        const radiusMeters = 6000 + Math.min(densityCount * 5000, 25000);
        
        // Heat color gradient matching traffic density intensity
        let heatColor = '#10b981'; // Green for 0 active courses (fluide/normal)
        let heatOpacity = 0.12;
        
        if (densityCount >= 5) {
          heatColor = '#ef4444'; // Red for heavy congestion
          heatOpacity = 0.50;
        } else if (densityCount >= 3) {
          heatColor = '#f97316'; // Orange for dense traffic
          heatOpacity = 0.38;
        } else if (densityCount >= 1) {
          heatColor = '#eab308'; // Yellow for moderate/active traffic
          heatOpacity = 0.25;
        }

        // Draw multiple overlapping concentric rings with decreasing opacity to simulate a radial heat glow
        // Outer glow
        L.circle([lat, lng], {
          radius: radiusMeters * 2.0,
          color: 'transparent',
          fillColor: heatColor,
          fillOpacity: heatOpacity * 0.25,
          interactive: false
        }).addTo(markersLayer);

        // Middle glow
        L.circle([lat, lng], {
          radius: radiusMeters * 1.4,
          color: 'transparent',
          fillColor: heatColor,
          fillOpacity: heatOpacity * 0.5,
          interactive: false
        }).addTo(markersLayer);

        // Central heat ring core
        L.circle([lat, lng], {
          radius: radiusMeters,
          color: heatColor,
          weight: 1,
          opacity: heatOpacity * 0.7,
          fillColor: heatColor,
          fillOpacity: heatOpacity,
          interactive: false
        }).addTo(markersLayer);

        // Subtly animate pulsing core circles for the active heatmap markers
        if (densityCount > 0) {
          L.circle([lat, lng], {
            radius: radiusMeters * 0.7,
            color: heatColor,
            weight: 2,
            opacity: 0.8,
            dashArray: '4, 4',
            fillColor: 'transparent',
            interactive: false
          }).addTo(markersLayer);
        }
      });
    }

    // 3.1. Neighborhood Markers
    dakarNeighborhoods.forEach((n) => {
      const isSelected = selectedNeighborhood?.name === n.name;
      const [lat, lng] = getLatLng(n.coords.x, n.coords.y);

      const htmlString = `
        <div class="flex flex-col items-center cursor-pointer select-none">
          <div class="w-2 h-2 rounded-full border border-slate-600 transition-all ${
            isSelected ? 'bg-blue-400 scale-125 shadow-lg shadow-blue-400' : 'bg-slate-700'
          }"></div>
          <span class="text-[9px] font-medium tracking-tight mt-1 px-1.5 py-0.5 rounded transition-all select-none ${
            isSelected
              ? 'bg-blue-600 text-white font-bold text-[10px] shadow-sm z-30'
              : 'bg-slate-900/85 text-slate-400'
          }">
            ${n.name}
          </span>
        </div>
      `;

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: htmlString,
          className: 'custom-neighborhood-marker',
          iconSize: [60, 30],
          iconAnchor: [30, 5],
        })
      });

      marker.on('click', () => {
        setSelectedNeighborhood(isSelected ? null : n);
      });

      marker.addTo(markersLayer);

      if (isSelected) {
        const popupHtml = `
          <div class="p-2.5 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg shadow-2xl w-44 font-sans text-xs">
            <h4 class="text-[11px] font-bold text-white mb-0.5">${n.name}</h4>
            <p class="text-[9px] text-slate-400 leading-normal mb-1">${n.description}</p>
            <div class="text-[8px] font-mono font-bold text-blue-400 flex justify-between uppercase">
              <span>Coords: ${n.coords.x}, ${n.coords.y}</span>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml, {
          closeButton: false,
          className: 'custom-leaflet-popup-card',
          offset: [0, 15]
        }).openPopup();
      }
    });

    // 3.2. Dynamic courses path and markers
    courses.forEach((course) => {
      const isSelected = selectedCourse?.id === course.id;
      const isPending = course.status === 'pending';
      const isRouteActive = course.status === 'on_trip' || course.status === 'en_route_pickup' || course.status === 'assigned';

      if (!isPending && !isRouteActive) return;

      const [pLat, pLng] = getLatLng(course.pickupCoords.x, course.pickupCoords.y);
      const [dLat, dLng] = getLatLng(course.dropoffCoords.x, course.dropoffCoords.y);

      // Pickup pin
      const pickupHtml = `
        <div class="flex flex-col items-center cursor-pointer select-none" style="transform: translate(-50%, -100%);">
          <div class="px-2 py-0.5 rounded-md text-[9px] font-bold text-white shadow-lg border flex items-center gap-1 leading-none ${
            isSelected
              ? 'bg-blue-500 border-blue-400'
              : isPending
              ? 'bg-amber-500 border-amber-400 animate-bounce'
              : 'bg-slate-800 border-slate-700'
          }">
            <span class="w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center text-[8px] text-slate-900 font-extrabold font-mono">D</span>
            <span>DEPART: ${course.pickup}</span>
          </div>
          <div class="w-2 h-2 -mt-0.5 border-l border-t rotate-45 ${
            isSelected ? 'bg-blue-500 border-blue-400' : isPending ? 'bg-amber-500 border-amber-400' : 'bg-slate-800 border-slate-700'
          }"></div>
        </div>
      `;

      const pMarker = L.marker([pLat, pLng], {
        icon: L.divIcon({
          html: pickupHtml,
          className: 'custom-pickup-marker',
          iconSize: [200, 40],
          iconAnchor: [100, 40]
        })
      });

      pMarker.on('click', () => {
        onSelectCourse(course);
      });
      pMarker.addTo(markersLayer);

      // Dropoff pin for selected course
      if (isSelected) {
        const dropoffHtml = `
          <div class="flex flex-col items-center cursor-pointer select-none" style="transform: translate(-50%, -100%);">
            <div class="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-600 border border-rose-500 text-white shadow-lg flex items-center gap-1 leading-none">
              <span class="w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center text-[8px] text-rose-600 font-extrabold font-mono">A</span>
              <span>ARRIVEE: ${course.dropoff}</span>
            </div>
            <div class="w-2 h-2 -mt-0.5 bg-rose-600 border-rose-500 border-l border-t rotate-45"></div>
          </div>
        `;

        const dMarker = L.marker([dLat, dLng], {
          icon: L.divIcon({
            html: dropoffHtml,
            className: 'custom-dropoff-marker',
            iconSize: [200, 40],
            iconAnchor: [100, 40]
          })
        });

        dMarker.on('click', () => {
          onSelectCourse(course);
        });
        dMarker.addTo(markersLayer);

        // Path drawing
        if (course.status === 'on_trip') {
          const ratio = course.progress / 100;
          const currentLat = pLat + (dLat - pLat) * ratio;
          const currentLng = pLng + (dLng - pLng) * ratio;

          // Green completed line
          L.polyline([[pLat, pLng], [currentLat, currentLng]], {
            color: '#10b981',
            weight: 4,
            opacity: 0.82
          }).addTo(markersLayer);

          // Blue dotted remaining line
          L.polyline([[currentLat, currentLng], [dLat, dLng]], {
            color: '#3b82f6',
            weight: 3,
            dashArray: '5, 5',
            opacity: 0.7
          }).addTo(markersLayer);
        } else {
          // Full blue route
          L.polyline([[pLat, pLng], [dLat, dLng]], {
            color: '#3b82f6',
            weight: 3.5,
            dashArray: '5, 5',
            opacity: 0.75
          }).addTo(markersLayer);
        }
      } else {
        // Dotted grey routes for unselected active courses
        L.polyline([[pLat, pLng], [dLat, dLng]], {
          color: '#475569',
          weight: 1.5,
          dashArray: '4, 4',
          opacity: 0.35
        }).addTo(markersLayer);
      }

      // 3.2.5 Dynamic Real-time Course Position Marker
      if (isRouteActive) {
        // Find assigned driver if any to get exact interactive location
        const assignedDriver = drivers.find(d => d.id === course.driverId);
        let currentX = course.pickupCoords.x;
        let currentY = course.pickupCoords.y;

        if (assignedDriver) {
          currentX = assignedDriver.coords.x;
          currentY = assignedDriver.coords.y;
        } else if (course.status === 'on_trip') {
          const ratio = (course.progress || 0) / 100;
          currentX = course.pickupCoords.x + (course.dropoffCoords.x - course.pickupCoords.x) * ratio;
          currentY = course.pickupCoords.y + (course.dropoffCoords.y - course.pickupCoords.y) * ratio;
        }

        const [cLat, cLng] = getLatLng(currentX, currentY);

        // Styling configuration based on current real-time state of the course
        let statusBadgeColor = 'bg-blue-600 border-blue-400 text-white';
        let statusLabel = 'Assigné';

        if (course.status === 'en_route_pickup') {
          statusBadgeColor = 'bg-amber-500 border-amber-300 text-slate-950';
          statusLabel = 'Approche';
        } else if (course.status === 'on_trip') {
          statusBadgeColor = 'bg-emerald-600 border-emerald-400 text-white';
          statusLabel = 'En course';
        }

        const courseMarkerHtml = `
          <div class="flex flex-col items-center select-none cursor-pointer" style="transform: translate(-50%, -100%); z-index: 9999;">
            <div class="px-2.5 py-1 rounded-lg text-[9px] font-extrabold border shadow-lg flex items-center gap-1.5 leading-none transition-all ${statusBadgeColor} ${
              isSelected ? 'ring-2 ring-white scale-110 shadow-xl' : 'opacity-90 hover:opacity-100'
            }">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span>${course.passengerName.split(' ')[0]}</span>
              <span class="px-1 py-0.2 bg-black/20 rounded font-mono text-[8px] uppercase">${statusLabel}</span>
            </div>
            {/* Minimal pointer element */}
            <div class="w-1.5 h-1.5 -mt-0.5 border-l border-t rotate-45 ${
              course.status === 'en_route_pickup' ? 'bg-amber-500 border-amber-300' : course.status === 'on_trip' ? 'bg-emerald-600 border-emerald-400' : 'bg-blue-600 border-blue-400'
            }"></div>
          </div>
        `;

        const courseActiveMarker = L.marker([cLat, cLng], {
          icon: L.divIcon({
            html: courseMarkerHtml,
            className: 'custom-active-course-marker',
            iconSize: [140, 32],
            iconAnchor: [70, 32]
          })
        });

        courseActiveMarker.on('click', () => {
          onSelectCourse(course);
        });

        courseActiveMarker.addTo(markersLayer);
      }
    });

    // 3.3. Active Driver Cars
    activeDrivers.forEach((driver) => {
      const isSelected = selectedDriver?.id === driver.id;
      const isBusy = driver.status === 'on_trip';
      const isAssigned = courses.some(c => c.driverId === driver.id && c.status === 'assigned');

      let colorClass = 'bg-emerald-500 text-emerald-950 shadow-emerald-500/30';
      let borderClass = 'border-emerald-300';
      if (isBusy) {
        colorClass = 'bg-rose-500 text-rose-950 shadow-rose-500/30';
        borderClass = 'border-rose-300';
      } else if (isAssigned) {
        colorClass = 'bg-blue-500 text-blue-950 shadow-blue-500/30';
        borderClass = 'border-blue-300';
      }

      const [lat, lng] = getLatLng(driver.coords.x, driver.coords.y);

      const htmlString = `
        <div class="flex flex-col items-center select-none" style="transform: translate(-50%, -120%);">
          <div class="bg-slate-900/95 border border-slate-700 text-[8px] font-bold text-slate-200 px-1.5 py-0.2 rounded shadow-md whitespace-nowrap mb-1">
            ${driver.name.split(' ')[0]} (${driver.batteryOrFuel}%)
          </div>
          <div class="relative w-7 h-7 rounded-full flex items-center justify-center border-2 border-solid shadow-lg ${colorClass} ${borderClass}">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 transform rotate-45 ${isBusy ? 'animate-pulse' : ''}" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            ${isSelected ? '<span class="absolute inset-x-0 inset-y-0 w-7 h-7 rounded-full border border-blue-400 animate-ping opacity-60"></span>' : ''}
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: htmlString,
          className: 'custom-driver-marker',
          iconSize: [40, 50],
          iconAnchor: [20, 50],
        })
      });

      marker.on('click', () => {
        onSelectDriver(driver);
      });

      marker.addTo(markersLayer);
    });

  }, [courses, drivers, selectedCourse, selectedDriver, selectedNeighborhood, showHeatmap]);

  return (
    <div id="live-map-container" className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans relative overflow-hidden select-none">
      {/* Main Interactive Leaflet Map Area */}
      <div 
        ref={mapContainerRef} 
        className="flex-1 w-full h-full z-0" 
        style={{ background: '#0f172a' }}
      />

      {/* FLOATING HEATMAP AND TRAFFIC SUPERVISION LAYER CONTROLS */}
      <div id="traffic-heatmap-overlay" className="absolute top-4 right-4 z-[1000] flex flex-col gap-2.5 max-w-[290px] w-full bg-slate-900/95 border border-slate-800/90 text-slate-100 p-3.5 rounded-xl shadow-2xl backdrop-blur-md pointer-events-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-xs tracking-tight uppercase text-white">Supervision du Trafic</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-800/60 px-1.5 py-0.5 rounded font-mono text-[9px] text-slate-400">
            <Layers className="w-3 h-3 text-indigo-400 font-bold" />
            <span>Flux Live</span>
          </div>
        </div>

        {/* Dynamic Map Style Selector */}
        <div className="flex flex-col gap-1.5 mb-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
          <span className="text-[10px] font-bold text-slate-300">Mode Carte</span>
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              onClick={() => setBaseMapType('traffic')}
              className={`py-1 text-[9px] font-extrabold rounded text-center transition-all ${
                baseMapType === 'traffic'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              🚀 Trafic Réel
            </button>
            <button
              onClick={() => setBaseMapType('dark')}
              className={`py-1 text-[9px] font-extrabold rounded text-center transition-all ${
                baseMapType === 'dark'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              🌑 Vue Sombre
            </button>
          </div>
        </div>

        {/* Dynamic heatmap toggle switch */}
        <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
          <span className="text-[10px] font-bold text-slate-300">Afficher la Densité VTC</span>
          <button
            id="btn-toggle-heatmap"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
              showHeatmap ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200" />
          </button>
        </div>

        {/* Density statistics checklist for neighborhoods */}
        <div className="flex flex-col gap-1.5 text-[10px]">
          <div className="text-slate-500 font-extrabold uppercase tracking-wider text-[8px] mt-1 mb-0.5">Densité active par quartier :</div>
          {dakarNeighborhoods.map((n) => {
            // Compute real-time courses related to this neighborhood
            const activeCount = courses.filter((c) => {
              const isRelevant = c.pickup.toLowerCase().trim() === n.name.toLowerCase().trim() ||
                                 c.dropoff.toLowerCase().trim() === n.name.toLowerCase().trim();
              const isActive = c.status !== 'completed' && c.status !== 'canceled';
              return isRelevant && isActive;
            }).length;

            // Compute percentage for progress bar (max 6 active for full bar)
            const percentage = Math.min((activeCount / 6) * 100, 100);

            // Determine label and colors matching Map concentric rings
            let badgeText = 'Fluide';
            let badgeColor = 'bg-slate-800/50 text-slate-400 border-slate-700/60';
            let barColor = 'bg-emerald-500';

            if (activeCount >= 5) {
              badgeText = 'Saturé';
              badgeColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
              barColor = 'bg-rose-500';
            } else if (activeCount >= 3) {
              badgeText = 'Dense';
              badgeColor = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
              barColor = 'bg-orange-500';
            } else if (activeCount >= 1) {
              badgeText = 'Actif';
              badgeColor = 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30';
              barColor = 'bg-yellow-500';
            }

            return (
              <div key={n.name} className="flex flex-col gap-1 p-1.5 rounded bg-slate-950/20 border border-slate-800/40 hover:bg-slate-800/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{n.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-400 font-bold">{activeCount} crs.</span>
                    <span className={`px-1 rounded text-[8px] border font-bold ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                </div>
                {/* Visual density mini indicator bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                    style={{ width: `${activeCount === 0 ? 5 : percentage}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map Legend Footer Panel */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 z-10 font-sans">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-300 shadow-md"></span>
            <span className="text-[11px] font-semibold text-slate-300">Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-300 shadow-md"></span>
            <span className="text-[11px] font-semibold text-slate-300">En course VTC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-300 shadow-md"></span>
            <span className="text-[11px] font-semibold text-slate-300">Assigné / Rejoint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 shadow-md"></span>
            <span className="text-[11px] font-semibold text-slate-300">Départ en attente</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 text-right">
          Technologie OSM + Leaflet activée
        </div>
      </div>
    </div>
  );
}
