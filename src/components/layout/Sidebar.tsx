import React, { useState } from 'react';
import { UserRole } from '@/types';
import { 
  LayoutDashboard, 
  Store, 
  ArrowUpDown, 
  Settings, 
  ShieldCheck, 
  Landmark, 
  Cloud, 
  CloudOff,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

interface SubMenuItem {
  to: string;
  label: string;
  icon: any;
  roles: UserRole[];
  key: string;
}

interface NavCategory {
  type: 'category';
  id: string;
  label: string;
  icon: any;
  items: SubMenuItem[];
}

interface NavSingleItem {
  type: 'item';
  to: string;
  label: string;
  icon: any;
  roles: UserRole[];
  key: string;
}

type NavEntry = NavCategory | NavSingleItem;

const Sidebar: React.FC = () => {
  const { auth, isSidebarOpen: isOpen, setIsSidebarOpen: setIsOpen, syncStatus } = useAppStore();
  const role = auth.user!.role;
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  // Navigation structure with collapsible categories
  const navigationStructure: NavEntry[] = [
    {
      type: 'category',
      id: 'curvas',
      label: 'Curvas',
      icon: TrendingUp,
      items: [
        {
          to: '/dashboard',
          label: 'Métricas Curvas',
          icon: LayoutDashboard,
          roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.SPECIALIST],
          key: 'dashboard'
        },
        {
          to: '/my-stores',
          label: 'Mis Tiendas',
          icon: Store,
          roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.SPECIALIST],
          key: 'my-stores'
        }
      ]
    },
    {
      type: 'category',
      id: 'gente',
      label: 'Gente',
      icon: Users,
      items: [
        {
          to: '/banca',
          label: 'Banca',
          icon: Landmark,
          roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.GUEST],
          key: 'banca'
        },
        {
          to: '/entries-exits',
          label: 'Ingresos y Retiros',
          icon: ArrowUpDown,
          roles: [UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR],
          key: 'entries-exits'
        }
      ]
    },
    {
      type: 'item',
      to: '/schedules',
      label: 'Planificación',
      icon: Calendar,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.SPECIALIST],
      key: 'schedules'
    },
    {
      type: 'item',
      to: '/safe-hands',
      label: 'Safe Hands',
      icon: ShieldCheck,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER],
      key: 'safe-hands'
    },
    {
      type: 'item',
      to: '/pulse',
      label: 'Pulse',
      icon: FileSpreadsheet,
      roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.GUEST],
      key: 'encuestas'
    },
    {
      type: 'item',
      to: '/admin',
      label: role === UserRole.ADMIN ? 'Configuración' : 'Gestión Equipo',
      icon: Settings,
      roles: [UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR],
      key: 'admin'
    }
  ];

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    curvas: false,
    gente: false
  });

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const isItemAllowed = (item: { roles: UserRole[]; key: string }) => {
    if (role === UserRole.GUEST) {
      const guestMods = auth.user?.allowedModules?.length ? auth.user.allowedModules : ['banca'];
      return guestMods.includes(item.key);
    }
    return item.roles.includes(role);
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-[#0b0f19] text-white flex flex-col transition-transform duration-300 ease-in-out transform
    lg:relative lg:translate-x-0 border-r border-slate-900/60
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <aside className={sidebarClasses}>
      {/* Header Area */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-900/50 relative">
        <div className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-3.5 relative shadow-md">
          <img src="/Favicon.png" alt="RED Logo" className="w-12 h-12 object-contain rounded-xl shrink-0" />
          <div className="flex flex-col min-w-0 justify-center pr-3">
            <span className="text-2xl font-black text-red-600 tracking-tight leading-none uppercase">
              RED
            </span>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider leading-tight mt-1">
              RUTA DE ENTRENAMIENTO Y DESEMPEÑO
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-xl transition text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Links Area */}
      <nav className="flex-1 px-3.5 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navigationStructure.map(entry => {
          if (entry.type === 'category') {
            const allowedCategoryItems = entry.items.filter(isItemAllowed);
            if (allowedCategoryItems.length === 0) return null;

            const isExpanded = !!expandedCategories[entry.id];
            const hasActiveChild = allowedCategoryItems.some(it => activeTab === it.key || location.pathname === it.to);
            const CategoryIcon = entry.icon;

            return (
              <div key={entry.id} className="space-y-1">
                {/* Category Header Button */}
                <button
                  type="button"
                  onClick={() => toggleCategory(entry.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-200 group cursor-pointer ${
                    hasActiveChild && !isExpanded
                      ? 'bg-red-950/30 text-red-400 border border-red-900/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      hasActiveChild ? 'bg-red-600/20 text-red-500' : 'bg-slate-800/40 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-wider">
                      {entry.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasActiveChild && !isExpanded && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-0' : '-rotate-90 text-slate-600'
                    }`} />
                  </div>
                </button>

                {/* Collapsible Sub-Items */}
                {isExpanded && (
                  <div className="pl-3 space-y-1 pt-0.5 border-l-2 border-slate-800/60 ml-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    {allowedCategoryItems.map(item => {
                      const isActive = activeTab === item.key || location.pathname === item.to;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.key}
                          to={item.to}
                          onClick={() => setIsOpen(false)}
                          className={`relative w-full flex items-center gap-3 px-3.5 py-2 rounded-xl transition-all duration-200 group ${
                            isActive
                              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_6px_20px_rgba(230,0,0,0.25)]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isActive ? 'bg-white/10 text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`font-black text-[11px] uppercase tracking-wider ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Single Independent Item
          if (!isItemAllowed(entry)) return null;

          const isActive = activeTab === entry.key || location.pathname === entry.to;
          const Icon = entry.icon;

          return (
            <Link
              key={entry.key}
              to={entry.to}
              onClick={() => setIsOpen(false)}
              className={`relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99] ${
                isActive 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_8px_25px_rgba(230,0,0,0.25)]' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                isActive ? 'bg-white/10 text-white' : 'bg-slate-800/40 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200'
              }`}>
                <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </div>

              <span className={`font-black text-xs uppercase tracking-wider ${
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
              }`}>
                {entry.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-900/50 mt-auto bg-[#0b0f19]">
        <div className={`rounded-2xl p-3.5 flex items-center justify-between border transition-all duration-500 ${
          syncStatus === 'syncing' 
            ? 'bg-slate-900/40 border-amber-500/20' 
            : syncStatus === 'online' 
              ? 'bg-[#121824] border-slate-800/40' 
              : 'bg-red-950/20 border-red-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {syncStatus === 'syncing' && (
              <div className="relative w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
            )}
            {syncStatus === 'online' && (
              <div className="relative w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Cloud className="w-4 h-4" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#121824] rounded-full flex items-center justify-center" />
              </div>
            )}
            {syncStatus !== 'syncing' && syncStatus !== 'online' && (
              <div className="relative w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                <CloudOff className="w-4 h-4" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#121824] rounded-full flex items-center justify-center" />
              </div>
            )}
            
            <div className="min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-wider leading-none">
                {syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'online' ? 'Nube Conectada' : 'Modo Offline'}
              </p>
              <p className="text-[8px] text-slate-500 font-bold mt-1 leading-none">
                {syncStatus === 'syncing' ? 'Guardando en la nube' : syncStatus === 'online' ? 'Sincronizado' : 'Guardando local'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
