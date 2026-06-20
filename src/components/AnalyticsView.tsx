import React from 'react';
import { BarChart3, TrendingUp, Users, Calendar, Award, AlertCircle, ShoppingBag, Landmark } from 'lucide-react';
import { Course, Driver } from '../types';

interface AnalyticsViewProps {
  courses: Course[];
  drivers: Driver[];
}

export default function AnalyticsView({ courses, drivers }: AnalyticsViewProps) {
  // Compute numbers
  const totalCoursesCount = courses.length;
  const completedCount = courses.filter((c) => c.status === 'completed').length;
  const canceledCount = courses.filter((c) => c.status === 'canceled').length;
  const activeCount = courses.filter((c) => ['on_trip', 'assigned', 'en_route_pickup'].includes(c.status)).length;

  const totalRevenue = 813000 + courses.filter((c) => c.status === 'completed').reduce((acc, curr) => acc + curr.price, 0);

  // Top drivers list based on rated score
  const sortedDriversByRating = [...drivers].sort((a, b) => b.rating - a.rating).slice(0, 3);

  // Hourly demand statistics chart (mock array representing real-time traffic levels throughout the day)
  const hourlyDemand = [
    { hour: '08h-10h', rate: 85, color: 'bg-rose-500' },
    { hour: '10h-12h', rate: 45, color: 'bg-amber-400' },
    { hour: '12h-14h', rate: 65, color: 'bg-blue-500' },
    { hour: '14h-16h', rate: 90, color: 'bg-emerald-500' }, // Current Peak
    { hour: '16h-18h', rate: 75, color: 'bg-blue-500' },
    { hour: '18h-20h', rate: 95, color: 'bg-rose-600' },
  ];

  return (
    <div id="analytics-panel" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left text-slate-800 font-sans">
      {/* Title */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
          <span>Analyses Jengu & Indicateurs de Performance</span>
        </h3>
        <p className="text-[11px] text-slate-400">Rapports d'activité de la flotte de dispatching en temps réel</p>
      </div>

      {/* Grid of micro cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-slate-200 bg-slate-50/50 p-3 rounded-xl">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Taux de Complétion</span>
          <span className="text-lg font-black font-mono block mt-1">
            {totalCoursesCount > 0 ? Math.round((completedCount / (totalCoursesCount - activeCount || 1)) * 100) : 100}%
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Sur les trajets finalisés</span>
        </div>

        <div className="border border-slate-200 bg-slate-50/50 p-3 rounded-xl">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Taux d'annulation</span>
          <span className="text-lg font-black font-mono text-rose-600 block mt-1">
            {totalCoursesCount > 0 ? Math.round((canceledCount / totalCoursesCount) * 100) : 0}%
          </span>
          <span className="text-[10px] text-slate-500 font-medium font-mono">{canceledCount} courses rejetées</span>
        </div>

        <div className="border border-slate-200 bg-slate-50/50 p-3 rounded-xl">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Revenu Moyen / Course</span>
          <span className="text-lg font-black font-mono text-emerald-600 block mt-1">
            {completedCount > 0 ? Math.round(courses.filter((c) => c.status === 'completed').reduce((acc, cr) => acc + cr.price, 0) / completedCount).toLocaleString() : '30 000'} FCFA
          </span>
          <span className="text-[10px] text-slate-500 font-medium font-sans">Panier moyen VTC</span>
        </div>

        <div className="border border-slate-200 bg-slate-50/50 p-3 rounded-xl">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Disponibilité Flotte</span>
          <span className="text-lg font-black font-mono text-blue-600 block mt-1">
            {drivers.length > 0 ? Math.round((drivers.filter((d) => d.status === 'available').length / drivers.length) * 100) : 0}%
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Chauffeurs connectés libres</span>
        </div>
      </div>

      {/* Grid of graphs and Top drivers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Graph: Hourly Demand */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Volume des demandes par heure</span>
            </h4>
            <p className="text-[10px] text-slate-400">Périodes de forte affluence (Simulation d'affluence Dakar)</p>
          </div>

          <div className="space-y-2.5">
            {hourlyDemand.map((d) => (
              <div key={d.hour} className="space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-600">{d.hour}</span>
                  <span className="font-mono text-slate-400">{d.rate}% d'occupation</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full w-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${d.color}`} style={{ width: `${d.rate}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-orange-50 border border-orange-100 text-[10px] font-bold text-orange-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Info Dispatch: Augmentation prévue de 25% des réservations vers 18h (Fin de journée Bureaux Plateau).</span>
          </div>
        </div>

        {/* Panel 2: Top Drivers and Revenue split */}
        <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Palmarès des Chauffeurs</span>
            </h4>
            <p className="text-[10px] text-slate-400">Chauffeurs d'élite sur la session en cours</p>
          </div>

          <div className="space-y-2 flex-1">
            {sortedDriversByRating.map((driver, index) => (
              <div key={driver.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-150">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] text-white ${
                    index === 0 ? 'bg-amber-400 shadow-md' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{driver.name}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">{driver.vehicle}</span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-slate-800">{driver.rating.toFixed(2)} ★</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">{driver.earnings.toLocaleString()} FCFA récoltés</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats distribution breakdown */}
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] font-semibold text-slate-500">
            <span>Part de marché Berline VIP: </span>
            <span className="font-mono text-slate-900 font-bold">42% de l'activité</span>
          </div>
        </div>
      </div>
    </div>
  );
}
