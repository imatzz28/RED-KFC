import React, { useState, useEffect } from 'react';
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
  ChevronLeft, 
  Calendar, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  X,
  Compass,
  ExternalLink,
  Globe
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { ICON_MAP } from '@/features/admin/components/QuickShortcutsManager';

interface SubMenuItem {
  to?: string;
  url?: string;
  label: string;
  icon: any;
  roles?: UserRole[];
  key: string;
  target?: '_blank' | '_self';
  isExternal?: boolean;
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
  const { 
    auth, 
    isSidebarOpen: isOpen, 
    setIsSidebarOpen: setIsOpen, 
    quickShortcuts,
    loadQuickShortcuts,
    syncStatus 
  } = useAppStore();
  const role = auth.user!.role;
  const location = useLocation();
  const activeTab = location.pathname.substring(1) || 'dashboard';

  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadQuickShortcuts();
  }, [loadQuickShortcuts]);

  // On mobile (< lg), the sidebar drawer is always full width and expanded.
  // On desktop (>= lg), it collapses to icons only when not hovered.
  const isCollapsed = isDesktop && !isHovered;

  // Filtrar accesos directos activos y permitidos para el rol
  const userShortcuts = (quickShortcuts || []).filter(sc => {
    if (sc.isActive === false) return false;
    if (!sc.roles || sc.roles.length === 0) return true;
    return sc.roles.includes(role);
  });

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
    ...(userShortcuts.length > 0 ? [{
      type: 'category' as const,
      id: 'shortcuts',
      label: 'Accesos',
      icon: Compass,
      items: userShortcuts.map(sc => {
        const IconComp = (sc.icon && ICON_MAP[sc.icon]) || Globe;
        return {
          url: sc.url,
          label: sc.title,
          icon: IconComp,
          roles: sc.roles || [],
          key: `shortcut-${sc.id}`,
          target: sc.target || '_blank',
          isExternal: true
        };
      })
    }] : []),
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
    gente: false,
    shortcuts: false
  });

  // Si la barra lateral se minimiza o se cierra, replegar automáticamente los menús desplegables
  useEffect(() => {
    if (isCollapsed || (!isDesktop && !isOpen)) {
      setExpandedCategories({
        curvas: false,
        gente: false,
        shortcuts: false
      });
    }
  }, [isCollapsed, isDesktop, isOpen]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const isItemAllowed = (item: { roles?: UserRole[]; key: string }) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (role === UserRole.GUEST) {
      const guestMods = auth.user?.allowedModules?.length ? auth.user.allowedModules : ['banca'];
      return guestMods.includes(item.key);
    }
    return item.roles.includes(role);
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 bg-[#0b0f19] text-white flex flex-col transition-all duration-300 ease-in-out transform
    lg:relative lg:translate-x-0 border-r border-slate-900/60 shadow-2xl lg:shadow-none
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    w-72 max-w-[85vw] ${isCollapsed ? 'lg:w-[76px] lg:min-w-[76px]' : 'lg:w-64 lg:min-w-[16rem]'}
  `;

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={sidebarClasses}
    >
      {/* Header Area */}
      <div className="px-3.5 pt-5 pb-2">
        <div className="flex items-center min-h-[44px] overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md">
            <img src="/logo.png" alt="RED Logo" className="w-8 h-8 object-contain rounded-lg" />
          </div>
          
          <div className={`overflow-hidden transition-all duration-300 ${
            isCollapsed ? 'max-w-0 opacity-0 ml-0 -translate-x-2' : 'max-w-[200px] opacity-100 ml-3.5 translate-x-0'
          }`}>
            <span className="text-4xl font-bold font-['Poppins'] text-white tracking-wide leading-none whitespace-nowrap">
              R.E.D
            </span>
          </div>

          {/* Close Button Mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition text-slate-400 ml-auto shrink-0 cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtle Divider Line */}
        <div className="mt-3.5 h-px bg-slate-800/60 w-full rounded-full" />
      </div>

      {/* Navigation Links Area */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
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
                  className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-2xl transition-all duration-200 group cursor-pointer overflow-hidden ${
                    hasActiveChild && !isExpanded
                      ? 'bg-red-950/30 text-red-400 border border-red-900/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      hasActiveChild ? 'bg-red-600/20 text-red-500' : 'bg-slate-800/40 text-slate-400 group-hover:text-slate-200'
                    }`}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    
                    <div className={`ml-3 overflow-hidden transition-all duration-300 ${
                      isCollapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[130px] opacity-100 translate-x-0'
                    }`}>
                      <span className="font-black text-xs uppercase tracking-wider whitespace-nowrap">
                        {entry.label}
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 transition-all duration-300 ${
                    isCollapsed ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-[30px] opacity-100'
                  }`}>
                    {hasActiveChild && !isExpanded && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-0' : '-rotate-90 text-slate-600'
                    }`} />
                  </div>
                </button>

                {/* Collapsible Sub-Items */}
                {isExpanded && !isCollapsed && (
                  <div className="pl-2 space-y-1 pt-0.5 border-l-2 border-slate-800/60 ml-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    {allowedCategoryItems.map(item => {
                      const isActive = activeTab === item.key || location.pathname === item.to;
                      const Icon = item.icon;

                      if (item.isExternal && item.url) {
                        return (
                          <a
                            key={item.key}
                            href={item.url}
                            target={item.target || '_blank'}
                            rel="noopener noreferrer"
                            onClick={() => setIsOpen(false)}
                            className="relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all duration-200 group text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all text-slate-400 group-hover:text-slate-200">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-black text-[11px] uppercase tracking-wider whitespace-nowrap truncate">
                                {item.label}
                              </span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-300 shrink-0" />
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={item.key}
                          to={item.to || '/'}
                          onClick={() => setIsOpen(false)}
                          className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group ${
                            isActive
                              ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_6px_20px_rgba(230,0,0,0.25)]'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isActive ? 'bg-white/10 text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className={`font-black text-[11px] uppercase tracking-wider whitespace-nowrap ${
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
              className={`relative w-full flex items-center px-2.5 py-2.5 rounded-2xl transition-all duration-200 group hover:scale-[1.01] active:scale-[0.99] overflow-hidden ${
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

              <div className={`ml-3 overflow-hidden transition-all duration-300 ${
                isCollapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[160px] opacity-100 translate-x-0'
              }`}>
                <span className={`font-black text-xs uppercase tracking-wider whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}>
                  {entry.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="px-3.5 py-4 border-t border-slate-900/50 mt-auto bg-[#0b0f19]">
        <div className={`rounded-2xl p-2.5 flex items-center border transition-all duration-300 overflow-hidden ${
          syncStatus === 'syncing' 
            ? 'bg-slate-900/40 border-amber-500/20' 
            : syncStatus === 'online' 
              ? 'bg-[#121824] border-slate-800/40' 
              : 'bg-red-950/20 border-red-500/20'
        }`}>
          <div className="flex items-center min-w-0 flex-1">
            {syncStatus === 'syncing' && (
              <div className="relative w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
            )}
            {syncStatus === 'online' && (
              <div className="relative w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Cloud className="w-4 h-4" />
                <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-500 border-2 border-[#121824] rounded-full" />
              </div>
            )}
            {syncStatus !== 'syncing' && syncStatus !== 'online' && (
              <div className="relative w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                <CloudOff className="w-4 h-4" />
                <span className="absolute bottom-1 right-1 w-2 h-2 bg-red-500 border-2 border-[#121824] rounded-full" />
              </div>
            )}
            
            <div className={`ml-3 overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'max-w-0 opacity-0 -translate-x-2' : 'max-w-[150px] opacity-100 translate-x-0'
            }`}>
              <p className="text-[10px] font-black text-white uppercase tracking-wider leading-none whitespace-nowrap">
                {syncStatus === 'syncing' ? 'Sincronizando' : syncStatus === 'online' ? 'Nube Conectada' : 'Modo Offline'}
              </p>
              <p className="text-[8px] text-slate-500 font-bold mt-1 leading-none whitespace-nowrap">
                {syncStatus === 'syncing' ? 'Guardando en la nube' : syncStatus === 'online' ? 'Sincronizado' : 'Guardando local'}
              </p>
            </div>
          </div>

          <div className={`transition-all duration-300 ${
            isCollapsed ? 'max-w-0 opacity-0 overflow-hidden' : 'max-w-[20px] opacity-100'
          }`}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
