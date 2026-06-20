import React from 'react';
import { LayoutDashboard, Car, Users, Map, BarChart3, Settings, ShieldAlert, LogOut, Terminal } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingCount: number;
  activeCount: number;
  currentUser: { email: string; name: string; source: 'supabase' | 'local'; id?: string } | null;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, pendingCount, activeCount, currentUser, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Tableau de bord', icon: LayoutDashboard, badge: pendingCount > 0 ? pendingCount : undefined, badgeColor: 'bg-amber-600' },
    { id: 'courses', name: 'Courses VTC', icon: Car, badge: activeCount > 0 ? activeCount : undefined, badgeColor: 'bg-emerald-600' },
    { id: 'drivers', name: 'Chauffeurs', icon: Users },
    { id: 'map', name: 'Superviser la Carte', icon: Map, pulse: true },
    { id: 'analytics', name: 'Analyses Jengu', icon: BarChart3 },
    { id: 'events', name: 'Console de dispatch', icon: Terminal },
  ];

  return (
    <div id="side-nav" className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-100 font-sans">
      {/* Branding Logo */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 antialiased font-bold text-lg">
          JT
        </div>
        <div>
          <div className="font-semibold text-sm tracking-wide text-slate-100 flex items-center gap-1.5">
            Jengu_Tech
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-xs text-slate-400 font-medium">DriveOps Dispatch</div>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 py-4 overflow-y-auto px-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase px-3 mb-2">
          Menu principal
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
              
              {item.pulse && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute top-3 right-3 animate-ping"></span>
              )}

              {item.badge !== undefined && (
                <span className={`ml-auto text-[10px] text-white font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-6">
          <div className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase px-3 mb-2">
            Paramétrage
          </div>
          <button
            id="nav-settings"
            onClick={() => setCurrentTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              currentTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4.5 h-4.5 text-slate-400" />
            <span>Paramètres Système</span>
          </button>
        </div>
      </div>

      {/* Dispatcher Session Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400 uppercase">
              {currentUser?.name
                ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : 'DS'}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate" title={currentUser?.name || "Saliou Diop"}>
              {currentUser?.name || 'Saliou Diop'}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold truncate flex items-center gap-1">
              <span>Dispatcher ({currentUser?.source === 'supabase' ? 'Cloud' : 'Sandbox'})</span>
            </div>
          </div>
          <button 
            id="btn-logout"
            onClick={onLogout}
            className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-mono truncate max-w-[110px]" title={currentUser?.email}>{currentUser?.email || 'saliou@jengu.tech'}</span>
          <span className="text-blue-400 font-semibold shrink-0">TDR: 99.8%</span>
        </div>
      </div>
    </div>
  );
}
