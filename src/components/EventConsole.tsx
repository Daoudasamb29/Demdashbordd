import React, { useState } from 'react';
import { Terminal, Shield, Play, Trash2, Download, Filter, Sparkles, Server } from 'lucide-react';
import { EventLog } from '../types';

interface EventConsoleProps {
  logs: EventLog[];
  onClearLogs: () => void;
}

export default function EventConsole({ logs, onClearLogs }: EventConsoleProps) {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    return log.type === filterType;
  });

  const getLogColorClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-emerald-400 border-emerald-500 bg-emerald-950/20';
      case 'warning':
        return 'text-amber-400 border-amber-500 bg-amber-950/20';
      case 'error':
        return 'text-rose-400 border-rose-500 bg-rose-950/20';
      case 'assign':
        return 'text-blue-400 border-blue-500 bg-blue-950/20';
      default:
        return 'text-slate-300 border-slate-700 bg-slate-900/40';
    }
  };

  const downloadLogs = () => {
    const rawText = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    const blob = new Blob([rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jengutech-dispatch-logs-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  return (
    <div id="logs-console" className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-5 space-y-4 font-mono select-text text-left">
      {/* Console Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              Console d'audit de dispatching
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono select-none animate-pulse">SYS_ON</span>
            </h3>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">Terminal interactif d'écoute d'événements VTC</p>
          </div>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-[10px] font-sans font-semibold text-slate-400 py-1 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Filtrer tout</option>
            <option value="info">Info</option>
            <option value="success">Création</option>
            <option value="assign">Assignation</option>
            <option value="warning">Alerte</option>
          </select>

          <button
            onClick={downloadLogs}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Télécharger l'historique brut"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-900/30 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Vider la console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal list logs elements */}
      <div className="h-64 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar text-[10.5px]">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-600 font-sans text-xs">
            Aucun log à afficher pour ce filtre.
          </div>
        ) : (
          [...filteredLogs].reverse().map((log) => (
            <div
              key={log.id}
              className={`border-l-2 p-2 rounded-r transition-colors flex items-start gap-2.5 ${getLogColorClass(log.type)}`}
            >
              <span className="text-slate-500 font-bold shrink-0">{log.timestamp}</span>
              <span className="leading-relaxed flex-1">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Console status footer */}
      <div className="flex justify-between items-center text-[9px] text-slate-600 border-t border-slate-900 pt-3 font-sans">
        <span className="flex items-center gap-1">
          <Server className="w-3 h-3" /> System status: ONLINE | Node SDK @google/genai enabled
        </span>
        <span>{filteredLogs.length} terminaux listés</span>
      </div>
    </div>
  );
}
