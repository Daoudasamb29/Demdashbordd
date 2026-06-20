import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Navigation, User, Phone, Users, CheckCircle2, RotateCcw, AlertCircle, ShoppingBag, Ticket } from 'lucide-react';
import { Course, Neighborhood } from '../types';
import { dakarNeighborhoods, getRouteData } from '../initialData';

interface CourseFormProps {
  onCreateCourse: (courseData: Omit<Course, 'id' | 'createdAt' | 'status' | 'driverId' | 'progress'>) => void;
  onClose: () => void;
}

export default function CourseForm({ onCreateCourse, onClose }: CourseFormProps) {
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [ticketNumber, setTicketNumber] = useState(() => 'TK-' + Math.floor(1000 + Math.random() * 9000));
  const [exactPickupAddress, setExactPickupAddress] = useState('');
  const [pickupName, setPickupName] = useState(dakarNeighborhoods[0].name);
  const [dropoffName, setDropoffName] = useState(dakarNeighborhoods[1].name);
  const [scheduledTime, setScheduledTime] = useState('Immédiat');
  const [customTime, setCustomTime] = useState('15:00');
  const [customDate, setCustomDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [passengersCount, setPassengersCount] = useState(1);
  const [babySeat, setBabySeat] = useState(false);
  const [vipVehicle, setVipVehicle] = useState(false);
  const [luggage, setLuggage] = useState(false);
  const [smartBypass, setSmartBypass] = useState(true);

  // Calculated variables
  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(0);

  // Recalculate distance, price, duration when coordinates shift
  useEffect(() => {
    const pickupNode = dakarNeighborhoods.find((n) => n.name === pickupName);
    const dropoffNode = dakarNeighborhoods.find((n) => n.name === dropoffName);

    if (pickupNode && dropoffNode) {
      if (pickupName === dropoffName) {
        setDistance(0);
        setDuration(0);
        setPrice(0);
        return;
      }
      const route = getRouteData(pickupName, dropoffName);
      const calculatedDist = route.dist;
      
      // If smartBypass is enabled, we assume the vehicles take optimized freeway routes
      // (Autoroute à péage / Contournement rapide) decreasing overall urban sitting time.
      const trafficDelayFactor = smartBypass ? 0.70 : 1.15; // Save 30% duration under smart bypass, otherwise add 15% traffic delay
      const calculatedDuration = Math.round((calculatedDist * 1.0 + 8) * trafficDelayFactor); 
      
      let finalPrice = route.basePrice;
      if (vipVehicle) finalPrice += 5000;
      if (babySeat) finalPrice += 1500;
      if (luggage) finalPrice += 1000;
      // Add +1500 FCFA toll processing fee (E-Toll / Rapido) for highway speed pass
      if (smartBypass) finalPrice += 2000;

      setDistance(calculatedDist);
      setDuration(calculatedDuration);
      setPrice(finalPrice);
    }
  }, [pickupName, dropoffName, vipVehicle, babySeat, luggage, smartBypass]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passengerName.trim()) return;

    const pickupNode = dakarNeighborhoods.find((n) => n.name === pickupName)!;
    const dropoffNode = dakarNeighborhoods.find((n) => n.name === dropoffName)!;

    onCreateCourse({
      passengerName,
      passengerPhone: passengerPhone || '+221 77 ' + Math.floor(1000000 + Math.random() * 9000000),
      pickup: exactPickupAddress.trim() || pickupName,
      pickupCoords: { x: pickupNode.coords.x, y: pickupNode.coords.y },
      dropoff: dropoffName,
      dropoffCoords: { x: dropoffNode.coords.x, y: dropoffNode.coords.y },
      price,
      distance,
      duration,
      scheduledTime: scheduledTime === 'Immédiat' ? 'Immédiat' : `Le ${customDate.split('-').reverse().join('/')} à ${customTime}`,
      passengersCount,
      options: {
        babySeat,
        vipVehicle,
        luggage,
      },
      ticketNumber: ticketNumber.trim() || 'TK-' + Math.floor(1000 + Math.random() * 9000),
    });

    // Reset on successful callback
    setPassengerName('');
    setPassengerPhone('');
    setExactPickupAddress('');
    setTicketNumber('TK-' + Math.floor(1000 + Math.random() * 9000));
    onClose();
  };

  return (
    <div id="new-course-modal" className="bg-white border text-left border-slate-200 shadow-2xl rounded-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar p-6 relative font-sans space-y-5 animate-fade-in">
      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Nouveau bon de course Jengu</span>
          </h3>
          <p className="text-[11px] text-slate-400">Générer un trajet VTC avec calcul d'itinéraire automatique</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 font-bold text-xs"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
        {/* Row 1: Passenger & Ticket */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Nom du passager</label>
            <div className="relative">
              <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                id="passenger-name-input"
                required
                placeholder="Ex. Seynabou Diop"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Numéro de téléphone</label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="tel"
                id="passenger-phone-input"
                placeholder="Ex. +221 77 123 4567"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Numéro de ticket</label>
            <div className="relative">
              <Ticket className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 font-bold" />
              <input
                type="text"
                id="ticket-number-input"
                required
                placeholder="Ex. TK-4921"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Route Dropdowns & Saisie Libre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="space-y-2">
            <div className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>DÉPART (Saisie Libre)</span>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-wider block">Adresse exacte de prise en charge</label>
              <input
                type="text"
                id="pickup-address-input"
                required
                placeholder="Ex: Rue 15 x Corniche, Dakar Plateau"
                value={exactPickupAddress}
                onChange={(e) => setExactPickupAddress(e.target.value)}
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-wider block">Ville / Région de rattachement</label>
              <select
                id="pickup-region-select"
                value={pickupName}
                onChange={(e) => setPickupName(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dakarNeighborhoods.map((n) => (
                  <option key={`pickup-${n.name}`} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 flex flex-col justify-between">
            <div className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-rose-500 rotate-90" />
              <span>ARRIVÉE</span>
            </div>

            <div className="space-y-1 flex-1 flex flex-col justify-end">
              <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">Ville / Hub de destination</label>
              <select
                id="dropoff-neighborhood-select"
                value={dropoffName}
                onChange={(e) => setDropoffName(e.target.value)}
                className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {dakarNeighborhoods.map((n) => (
                  <option key={`dropoff-${n.name}`} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Coords same detection warning */}
        {pickupName === dropoffName && (
          <div className="bg-rose-50 text-rose-600 border border-rose-100 p-2 rounded-lg text-[10px] flex items-center gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Erreur d'itinéraire : Le départ et l'arrivée ne peuvent pas être identiques.</span>
          </div>
        )}

        {/* Row 3: Co-passagers and Schedule */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Nombre de passagers</label>
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPassengersCount(num)}
                  className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                    passengersCount === num ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Horaire de départ</label>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setScheduledTime('Immédiat')}
                className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                  scheduledTime === 'Immédiat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Immédiat
              </button>
              <button
                type="button"
                onClick={() => setScheduledTime('Planifié')}
                className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                  scheduledTime === 'Planifié' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Planifié
              </button>
            </div>
          </div>
        </div>

        {/* Custom time and date picker if scheduled */}
        {scheduledTime === 'Planifié' && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg animate-fade-in grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-widest block font-extrabold text-indigo-600">Date de départ</label>
              <input
                type="date"
                required
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-widest block font-extrabold text-indigo-600">Heure de départ</label>
              <input
                type="time"
                required
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Row 4: Comfort Options */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Services complémentaires</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setVipVehicle(!vipVehicle)}
              className={`py-2 px-2 border rounded-lg text-center flex flex-col items-center gap-1 font-bold ${
                vipVehicle
                  ? 'bg-amber-500/10 text-amber-700 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px]">Véhicule VIP (+5 000 F)</span>
            </button>

            <button
              type="button"
              onClick={() => setBabySeat(!babySeat)}
              className={`py-2 px-2 border rounded-lg text-center flex flex-col items-center gap-1 font-bold ${
                babySeat
                  ? 'bg-blue-500/10 text-blue-700 border-blue-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px]">Siège Bébé (+1 500 F)</span>
            </button>

            <button
              type="button"
              onClick={() => setLuggage(!luggage)}
              className={`py-2 px-2 border rounded-lg text-center flex flex-col items-center gap-1 font-bold ${
                luggage
                  ? 'bg-purple-500/10 text-purple-700 border-purple-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-[10px]">Bagages (+1 000 F)</span>
            </button>
          </div>
        </div>

        {/* Dakar Smart Traffic Bypass Optimizer Option */}
        <div className="p-3 bg-gradient-to-r from-teal-50/70 to-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div>
                <span className="font-bold text-[10px] text-emerald-800 uppercase tracking-widest block">Évitement de trafic intelligent (Premium)</span>
                <span className="text-[9px] text-emerald-600 font-medium">Contournement automatique des bouchons via Autoroute & VDN</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSmartBypass(!smartBypass)}
              id="btn-toggle-smart-bypass"
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none flex items-center ${
                smartBypass ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {smartBypass ? (
            <div className="text-[9.5px] text-emerald-700 leading-relaxed font-normal bg-white/70 p-2 rounded border border-emerald-100/55">
              🚀 <span className="font-bold">Gain ciblé :</span> ~30% de temps économisé en évitant les filtres de Pikine et de l'avenue Cheikh Anta Diop. Intègre automatiquement les frais d'autoroute à péage (+2 000 F Rapido inclus).
            </div>
          ) : (
            <div className="text-[9.5px] text-slate-500 leading-relaxed font-normal bg-slate-100/50 p-2 rounded border border-slate-200/60">
              ⚠️ Mode itinéraire classique sélectionné. Trajet susceptible de subir d'importantes congestions aux heures de pointe d'entrée/sortie de Dakar.
            </div>
          )}
        </div>

        {/* Dynamic Pricing Estimate Frame */}
        <div className="bg-slate-900 text-white rounded-xl p-3 flex justify-between items-center mt-2 select-none border border-slate-800">
          <div>
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Itinéraire calculé</div>
            <div className="text-xs font-bold text-slate-200">
              {distance} km · env. {duration} minutes
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Tarif calculé</div>
            <div className="text-lg font-black text-rose-400 font-mono">{price.toLocaleString()} FCFA</div>
          </div>
        </div>

        {/* Action Footers */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Abandonner
          </button>
          <button
            type="submit"
            id="btn-create-course-submit"
            disabled={pickupName === dropoffName}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 select-none text-white rounded-lg text-xs font-black shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider la course</span>
          </button>
        </div>
      </form>
    </div>
  );
}
