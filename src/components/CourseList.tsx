import React, { useState } from 'react';
import { Search, MapPin, Navigation, Clock, User, Phone, CheckCircle2, XCircle, UserPlus, Sparkles, Filter, ChevronRight, Ticket } from 'lucide-react';
import { Course, Driver } from '../types';

interface CourseListProps {
  courses: Course[];
  drivers: Driver[];
  selectedCourse: Course | null;
  onSelectCourse: (course: Course | null) => void;
  onAssignDriverClick: (course: Course) => void;
  onCompleteCourse: (courseId: string) => void;
  onCancelCourse: (courseId: string) => void;
  onRejectCourse?: (courseId: string) => void;
}

export default function CourseList({
  courses,
  drivers,
  selectedCourse,
  onSelectCourse,
  onAssignDriverClick,
  onCompleteCourse,
  onCancelCourse,
  onRejectCourse,
}: CourseListProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const statusCategories = [
    { id: 'all', name: 'Tous', count: courses.length },
    { id: 'pending', name: 'En attente', count: courses.filter((c) => c.status === 'pending').length, color: 'bg-amber-500' },
    { id: 'active', name: 'En cours VTC', count: courses.filter((c) => c.status === 'on_trip' || c.status === 'assigned' || c.status === 'en_route_pickup').length, color: 'bg-blue-500' },
    { id: 'completed', name: 'Terminés', count: courses.filter((c) => c.status === 'completed').length },
  ];

  // Filter courses based on status tabs and search query
  const filteredCourses = courses.filter((c) => {
    // 1. Status Filter
    if (filterStatus === 'pending' && c.status !== 'pending') return false;
    if (filterStatus === 'active' && !['on_trip', 'assigned', 'en_route_pickup'].includes(c.status)) return false;
    if (filterStatus === 'completed' && c.status !== 'completed') return false;

    // 2. Search Query (Passenger, Pickup, or Dropoff address)
    const query = searchQuery.toLowerCase();
    if (query) {
      const matchName = c.passengerName.toLowerCase().includes(query);
      const matchPickup = c.pickup.toLowerCase().includes(query);
      const matchDropoff = c.dropoff.toLowerCase().includes(query);
      const matchId = c.id.toLowerCase().includes(query);
      return matchName || matchPickup || matchDropoff || matchId;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">En attente</span>;
      case 'assigned':
        return <span className="text-[10px] bg-indigo-500/10 text-indigo-600 font-bold border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Assigné</span>;
      case 'en_route_pickup':
        return <span className="text-[10px] bg-pink-500/10 text-pink-600 font-bold border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Approche</span>;
      case 'on_trip':
        return <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">En Route <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span></span>;
      case 'completed':
        return <span className="text-[10px] bg-slate-100 text-slate-500 font-bold border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Complété</span>;
      case 'canceled':
        return <span className="text-[10px] bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Annulé</span>;
      default:
        return null;
    }
  };

  return (
    <div id="course-manager" className="flex flex-col h-full bg-white font-sans">
      {/* Search Header */}
      <div className="p-4 bg-white border-b border-slate-200 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase flex items-center gap-2">
          <span>Gestion des courses</span>
          <span className="text-xs bg-slate-100 text-slate-600 font-bold py-0.5 px-2 rounded-full">
            {courses.length} total
          </span>
        </h3>
        
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            id="course-search-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher passager, quartier, ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filter status category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusCategories.map((cat) => (
            <button
              key={cat.id}
              id={`filter-tab-${cat.id}`}
              onClick={() => setFilterStatus(cat.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                filterStatus === cat.id
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterStatus === cat.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500 font-bold'}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Courses List Scrollable container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <div className="text-slate-400 font-medium text-xs">Aucune course trouvée</div>
            <p className="text-[11px] text-slate-500">Essayez de modifier vos filtres ou de créer une nouvelle course.</p>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isSelected = selectedCourse?.id === course.id;
            const assignedDriver = drivers.find((d) => d.id === course.driverId);

            return (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                onClick={() => onSelectCourse(isSelected ? null : course)}
                className={`border rounded-xl p-4 transition-all hover:shadow-md cursor-pointer relative ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 shadow-md ring-2 ring-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Visual Line Accent for Selected Card */}
                {isSelected && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-600 rounded-l-xl"></div>
                )}

                {/* Top Details bar */}
                <div className="flex justify-between items-start gap-2 mb-2.5 font-sans">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold text-slate-400 tracking-wider">
                      #{course.id}
                    </span>
                    {course.ticketNumber && (
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Numéro de Ticket">
                        <Ticket className="w-2.5 h-2.5 text-blue-500" />
                        {course.ticketNumber}
                      </span>
                    )}
                  </div>
                  <div>{getStatusBadge(course.status)}</div>
                </div>

                {/* Route detail paths */}
                <div className="space-y-2 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-blue-500/20 shrink-0"></div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Départ</span>
                      <span className="text-xs font-bold text-slate-800 truncate">{course.pickup}</span>
                    </div>
                  </div>

                  <div className="ml-1.25 border-l-2 border-dashed border-slate-200 h-3.5 my-0.5"></div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-600 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-rose-500/20 shrink-0"></div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Destination</span>
                      <span className="text-xs font-bold text-slate-800 truncate">{course.dropoff}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-semibold border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.scheduledTime}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Dist: </span>
                    <span>{course.distance} km</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Prix: </span>
                    <span className="text-slate-900 font-bold font-mono">{course.price.toLocaleString()} FCFA</span>
                  </div>
                </div>

                {/* Passenger row */}
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold shrink-0">
                      {course.passengerName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{course.passengerName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{course.passengerPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Options micro tags */}
                  <div className="flex gap-1">
                    {course.options.vipVehicle && (
                      <span className="bg-amber-500/10 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded" title="Classe VIP Berline">VIP</span>
                    )}
                    {course.options.babySeat && (
                      <span className="bg-blue-500/10 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded" title="Siège Bébé inclus">BÉBÉ</span>
                    )}
                    {course.options.luggage && (
                      <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded" title="Bagages volumineux">BAG</span>
                    )}
                  </div>
                </div>

                {/* Active Trip Progress slider bar */}
                {course.status === 'on_trip' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">Progression du trajet</span>
                      <span className="text-emerald-700 font-mono font-bold">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Driver Assignment Block / Action row */}
                {isSelected && (
                  <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col gap-2">
                    {assignedDriver ? (
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                            {assignedDriver.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-800">{assignedDriver.name}</div>
                            <div className="text-[9px] text-slate-500 font-mono font-bold leading-none mt-0.5">{assignedDriver.vehicle}</div>
                          </div>
                        </div>
                        <span className="bg-slate-200 text-slate-800 text-[9px] font-bold font-mono px-2 py-0.5 rounded border border-slate-300">
                          {assignedDriver.plate}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-orange-50 border border-orange-200 p-2 text-center text-orange-800 text-[11px] font-medium">
                        ⚠️ Aucun chauffeur assigné à cette course
                      </div>
                    )}

                    {/* Dispatcher Manual Operations buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {course.status === 'pending' && (
                        <button
                          id={`btn-assign-${course.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignDriverClick(course);
                          }}
                          className="col-span-2 w-full py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Assigner un chauffeur</span>
                        </button>
                      )}

                      {['assigned', 'en_route_pickup', 'on_trip'].includes(course.status) && (
                        <button
                          id={`btn-complete-${course.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteCourse(course.id);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Terminer</span>
                        </button>
                      )}

                      {course.status !== 'completed' && course.status !== 'canceled' && (
                        <button
                          id={`btn-cancel-${course.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelCourse(course.id);
                          }}
                          className="py-2 border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Annuler</span>
                        </button>
                      )}

                      {['assigned', 'en_route_pickup'].includes(course.status) && onRejectCourse && (
                        <button
                          id={`btn-reject-${course.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRejectCourse(course.id);
                          }}
                          className="col-span-2 w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Simuler un rejet de l'assignation par le chauffeur"
                        >
                          <XCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Simuler Refus Chauffeur</span>
                        </button>
                      )}
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
