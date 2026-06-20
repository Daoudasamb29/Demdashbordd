import React from 'react';
import { Users, Car, Star, Navigation, Clock, AlertCircle, Ticket } from 'lucide-react';
import { Course, Driver } from '../types';

interface AssignmentModalProps {
  course: Course;
  drivers: Driver[];
  onAssign: (courseId: string, driverId: string) => void;
  onClose: () => void;
}

export default function AssignmentModal({ course, drivers, onAssign, onClose }: AssignmentModalProps) {
  // Only match drivers who are online ('available' or 'on_trip' status)
  // For optimal assignment, we prefer drivers with 'available' status, but we list them all so the dispatcher can override!
  const onlineDrivers = drivers.filter((d) => d.status !== 'offline');

  // Compute stats for each driver relative to the course pickup point
  const mappedDrivers = onlineDrivers.map((driver) => {
    const dx = course.pickupCoords.x - driver.coords.x;
    const dy = course.pickupCoords.y - driver.coords.y;
    
    // Distance simulation
    let distanceToPickup = Math.sqrt(dx * dx + dy * dy) * 0.18;
    distanceToPickup = Math.max(0.4, Math.round(distanceToPickup * 10) / 10);
    
    // ETA is roughly 2 minutes per km
    const eta = Math.max(2, Math.round(distanceToPickup * 1.8));

    return {
      ...driver,
      distanceToPickup,
      eta,
    };
  }).sort((a, b) => {
    // Sort available first, then busiest or closest
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (a.status !== 'available' && b.status === 'available') return 1;
    return a.distanceToPickup - b.distanceToPickup;
  });

  return (
    <div id="assign-driver-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in select-none">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-left space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Assignation de Chauffeur</span>
            </h3>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 flex-wrap mt-0.5">
              <span>Sélectionner le chauffeur idéal pour la course</span> 
              <strong className="text-blue-600">#{course.id}</strong> 
              {course.ticketNumber && (
                <span className="bg-blue-50 text-blue-600 border border-blue-100 font-mono text-[9px] font-bold px-1 rounded flex items-center gap-0.5">
                  <Ticket className="w-2.5 h-2.5" />
                  {course.ticketNumber}
                </span>
              )}
              <span>({course.pickup} → {course.dropoff})</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xs">
            ✕
          </button>
        </div>

        {/* Course Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex justify-between items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">Passager</span>
            <span className="font-bold text-slate-800">{course.passengerName}</span>
          </div>
          {course.ticketNumber && (
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">Ticket</span>
              <span className="bg-blue-50 text-blue-800 font-mono font-bold border border-blue-200 rounded px-1.5 py-0.5 text-[9px] flex items-center gap-0.5">
                <Ticket className="w-2.5 h-2.5 text-blue-500" />
                {course.ticketNumber}
              </span>
            </div>
          )}
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">Tarif & Dist</span>
            <span className="font-bold text-slate-800">{course.price.toLocaleString()} FCFA · {course.distance} km</span>
          </div>
        </div>

        {/* Options list of matched drivers */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {mappedDrivers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-semibold">
              ⚠️ Aucun chauffeur connecté ou en service n'a été trouvé.
              <p className="text-[10px] text-slate-400 mt-1 font-normal">Activez un chauffeur depuis l'onglet Chauffeurs.</p>
            </div>
          ) : (
            mappedDrivers.map((driver) => {
              const isBusy = driver.status === 'on_trip';
              
              return (
                <div
                  key={driver.id}
                  id={`match-driver-row-${driver.id}`}
                  className="border border-slate-150 rounded-xl p-3.5 hover:border-blue-300 hover:bg-slate-50 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 bg-slate-900 border border-slate-800 text-white rounded-full flex items-center justify-center font-bold uppercase">
                        {driver.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        isBusy ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                      }`}></div>
                    </div>

                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        {driver.name}
                        {isBusy ? (
                          <span className="text-[8px] bg-rose-100 text-rose-800 border border-rose-200 font-bold px-1.5 rounded-full select-none">Occupé</span>
                        ) : (
                          <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-1.5 rounded-full select-none">Dispo</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{driver.vehicle} · {driver.plate}</div>
                      <div className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{driver.rating.toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">({driver.tripsCount} courses)</span>
                      </div>
                    </div>
                  </div>

                  {/* Distance & ETA metrics & Actions */}
                  <div className="text-right space-y-2 shrink-0">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500">
                        Proximité: <span className="font-mono text-slate-800 font-extrabold">{driver.distanceToPickup} km</span>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-600 flex items-center justify-end gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>Arrivée env. {driver.eta} min</span>
                      </div>
                    </div>

                    <button
                      id={`btn-match-assign-${driver.id}`}
                      onClick={() => onAssign(course.id, driver.id)}
                      className="py-1.5 px-3 w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white font-bold text-[11px] rounded-lg cursor-pointer shadow-sm flex items-center justify-center gap-1"
                    >
                      <span>Assigner</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info warning */}
        <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 p-3 rounded-xl text-[10px] flex items-start gap-2 select-none">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Règle de répartition DriveOps :</strong> Privilégiez systématiquement le chauffeur disponible avec le temps d'approche le plus faible afin de réduire le temps d'attente client.
          </span>
        </div>

        {/* Bottom cancellation buttons */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="w-full py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
