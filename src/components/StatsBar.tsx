import React from 'react';
import { Car, Clock, Users, ArrowUpRight, TrendingUp, Compass, EuroIcon } from 'lucide-react';
import { Course, Driver } from '../types';

interface StatsBarProps {
  courses: Course[];
  drivers: Driver[];
}

export default function StatsBar({ courses, drivers }: StatsBarProps) {
  const pendingCourses = courses.filter((c) => c.status === 'pending');
  const activeCourses = courses.filter((c) => c.status === 'on_trip' || c.status === 'assigned' || c.status === 'en_route_pickup');
  const availableDrivers = drivers.filter((d) => d.status === 'available');
  const onlineDrivers = drivers.filter((d) => d.status !== 'offline');
  
  // Total Revenue for completed courses today
  const baseRevenue = 813000; // baseline of ca in FCFA (equivalent of ~1240 EUR)
  const completedRevenue = courses
    .filter((c) => c.status === 'completed')
    .reduce((sum, c) => sum + c.price, 0);
  const totalRevenue = baseRevenue + completedRevenue;

  // Average dispatch wait time (simulated or dynamic)
  const avgWaitTime = pendingCourses.length > 0 ? (3 + pendingCourses.length * 1.5) : 4.5;

  return (
    <div id="stats-container" className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-slate-200 bg-white">
      {/* Metric 1 */}
      <div id="stat-[courses-actives]" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition-shadow">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Courses Actives
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {activeCourses.length}
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            {courses.filter(c => c.status === 'on_trip').length} en cours de trajet
          </div>
        </div>
        <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
          <Compass className="w-5 h-5" />
        </div>
      </div>

      {/* Metric 2 */}
      <div id="stat-[en-attente]" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition-shadow">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            En attente d'assignation
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {pendingCourses.length}
          </div>
          <div className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Moy. d'attente : {avgWaitTime.toFixed(1)}m
          </div>
        </div>
        <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* Metric 3 */}
      <div id="stat-[chauffeurs-dispo]" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition-shadow">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Chauffeurs Dispos
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {availableDrivers.length} <span className="text-xs text-slate-400 font-normal">/ {onlineDrivers.length} connectés</span>
          </div>
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Taux d'activité : {((drivers.filter(d => d.status === 'on_trip').length / (onlineDrivers.length || 1)) * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Metric 4 */}
      <div id="stat-[chiffre-affaires]" className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-start hover:shadow-sm transition-shadow">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            CA Estimé Aujourd'hui
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalRevenue.toLocaleString()} F
          </div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            +18.4% depuis hier
          </div>
        </div>
        <div className="bg-amber-500/10 p-2 rounded-lg text-amber-700">
          <span className="font-bold text-xs font-sans">FCFA</span>
        </div>
      </div>
    </div>
  );
}
