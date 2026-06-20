import React, { useState } from 'react';
import { Search, Star, Battery, Fuel, Phone, Navigation, ToggleLeft, ToggleRight, AlertTriangle, Coins } from 'lucide-react';
import { Driver, DriverStatus } from '../types';

interface DriverListProps {
  drivers: Driver[];
  selectedDriver: Driver | null;
  onSelectDriver: (driver: Driver | null) => void;
  onToggleDriverStatus: (driverId: string) => void;
}

export default function DriverList({
  drivers,
  selectedDriver,
  onSelectDriver,
  onToggleDriverStatus,
}: DriverListProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'on_trip' | 'offline'>('all');

  const filteredDrivers = drivers.filter((d) => {
    // 1. Status filter
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;

    // 2. Text Search index
    const query = searchQuery.toLowerCase();
    if (query) {
      return (
        d.name.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query) ||
        d.vehicle.toLowerCase().includes(query) ||
        d.plate.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getStatusTag = (status: DriverStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            Disponible
          </span>
        );
      case 'on_trip':
        return (
          <span className="text-[10px] uppercase font-black tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
            En course
          </span>
        );
      case 'offline':
        return (
          <span className="text-[10px] uppercase font-black tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full">
            Inactif
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="driver-hub" className="flex flex-col h-full bg-white font-sans">
      {/* Search Header */}
      <div className="p-4 bg-white border-b border-slate-200 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase flex items-center justify-between">
          <span>Flotte des chauffeurs</span>
          <span className="text-[11px] bg-slate-100 text-slate-600 font-bold py-0.5 px-2 rounded-full">
            {drivers.filter(d => d.status !== 'offline').length} / {drivers.length} actifs
          </span>
        </h3>

        {/* Search Input bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            id="driver-search-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher chauffeur, immat', véhicule..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Categories togglers */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg">
          {(['all', 'available', 'on_trip', 'offline'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {status === 'all' ? 'Tous' : status === 'available' ? 'Dispo' : status === 'on_trip' ? 'Course' : 'Off'}
            </button>
          ))}
        </div>
      </div>

      {/* Driver list container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <p className="text-slate-400 font-medium text-xs">Aucun chauffeur ne correspond</p>
          </div>
        ) : (
          filteredDrivers.map((driver) => {
            const isSelected = selectedDriver?.id === driver.id;
            const isLowEnergy = driver.batteryOrFuel < 25;

            return (
              <div
                key={driver.id}
                id={`driver-card-${driver.id}`}
                onClick={() => onSelectDriver(isSelected ? null : driver)}
                className={`border rounded-xl p-4 transition-all hover:border-slate-300 hover:shadow-md cursor-pointer relative ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/10'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Visual Line Accent for Selected Card */}
                {isSelected && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-600 rounded-l-xl"></div>
                )}

                {/* Driver information header */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm tracking-wide">
                        {driver.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        driver.status === 'available' ? 'bg-emerald-500' : driver.status === 'on_trip' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}></div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        {driver.name}
                        <span className="text-[10px] text-slate-400 font-mono">#{driver.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">{driver.phone}</div>
                    </div>
                  </div>
                  <div>{getStatusTag(driver.status)}</div>
                </div>

                {/* Vehicle specifications and rating */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-2.5 border border-slate-100">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-slate-700 truncate max-w-[70%]">{driver.vehicle}</span>
                    <span className="font-mono bg-white text-slate-600 border border-slate-200 rounded px-1.5 py-0.2 font-bold select-none uppercase">
                      {driver.plate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-bold pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                      <span>{driver.rating.toFixed(2)} / 5.0</span>
                    </div>

                    <div className="flex items-center justify-end gap-1 select-none">
                      {isLowEnergy ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0 animate-bounce" />
                      ) : (
                        <Battery className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className={isLowEnergy ? 'text-orange-600 font-extrabold animate-pulse' : 'text-slate-600'}>
                        {driver.batteryOrFuel}% {isLowEnergy ? 'Batterie Basse' : 'Énergie'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics and simulator toggle status */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-150">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Trajets aujourd'hui</div>
                        <div className="text-sm font-black text-slate-800 font-mono">{driver.tripsCount}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-150">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Gains cumulés</div>
                        <div className="text-sm font-black text-slate-800 font-mono flex items-center justify-center gap-0.5"><Coins className="w-3.5 h-3.5 text-emerald-600" /> {driver.earnings.toLocaleString()} FCFA</div>
                      </div>
                    </div>

                    {/* Simulation togglers */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        <div className="font-bold text-slate-700">Service du Chauffeur</div>
                        <p className="text-[9px] text-slate-400">Modifier l'état de service pour la supervision</p>
                      </div>

                      <button
                        id={`btn-toggle-driver-${driver.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleDriverStatus(driver.id);
                        }}
                        className={`font-semibold cursor-pointer py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all text-[11px] ${
                          driver.status !== 'offline'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                        disabled={driver.status === 'on_trip'}
                      >
                        {driver.status !== 'offline' ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                            <span>En Service</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>Hors Service</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
