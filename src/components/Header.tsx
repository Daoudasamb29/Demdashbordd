import React, { useState, useEffect } from 'react';
import { Calendar, Clock, PlusCircle, Shuffle, ShieldCheck, Waves, Database } from 'lucide-react';
import { isSupabaseConfigured } from '../supabaseClient';

interface HeaderProps {
  onOpenCreateModal: () => void;
  onGenerateRandomCourse: () => void;
}

export default function Header({ onOpenCreateModal, onGenerateRandomCourse }: HeaderProps) {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const isDbConnected = isSupabaseConfigured();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="top-bar-jengu" className="bg-slate-900 border-b border-slate-800 text-slate-100 p-4 md:px-6 flex flex-wrap items-center justify-between gap-4 font-sans select-none">
      {/* Branding with dynamic elements */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-lg shadow-indigo-500/20 antialiased italic text-lg leading-none">
          JT
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black tracking-widest text-white uppercase">
              JENGU_TECH · DRIVEOPS
            </h1>
            <span className="bg-blue-500/15 text-blue-400 text-[9px] font-bold px-1.5 py-0.2 rounded border border-blue-500/35 uppercase">PRO v1.2</span>
            <span 
              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase flex items-center gap-1 transition-all ${
                isDbConnected 
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35' 
                  : 'bg-amber-500/15 text-amber-500 border-amber-500/35'
              }`} 
              title={isDbConnected ? "Supabase Connecté et opérationnel" : "Supabase non configuré (modifiez le fichier .env)"}
            >
              <Database className="w-2.5 h-2.5" />
              <span>SUPABASE</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`}></span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Panneau dispatcher intelligent de gestion de courses VTC</p>
        </div>
      </div>

      {/* Center real-time dynamic Clock */}
      <div className="hidden lg:flex items-center gap-6 bg-slate-950/40 border border-slate-800 rounded-2xl px-5 py-2">
        <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300 capitalize">{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black font-mono tracking-widest text-emerald-300">{time}</span>
        </div>
      </div>

      {/* Buttons to trigger operations */}
      <div className="flex items-center gap-2">
        {/* Simulate Random Ride request */}
        <button
          id="btn-trigger-random-trip"
          onClick={onGenerateRandomCourse}
          title="Simuler un appel client instantané et générer une course"
          className="px-3.5 py-2 bg-gradient-to-r from-amber-600/90 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/10 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Simuler Demande VTC</span>
        </button>

        {/* Create Manual Trip order */}
        <button
          id="btn-open-manual-form"
          onClick={onOpenCreateModal}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Créer une Course</span>
        </button>
      </div>
    </div>
  );
}
