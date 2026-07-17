
import React, { useEffect } from 'react';
import { UserRole } from '@/types';
import Login from '@/features/auth/Login';
import Dashboard from '@/features/dashboard/Dashboard';
import Sidebar from '@/components/layout/Sidebar';
import AdminPanel from '@/features/admin/AdminPanel';
import Header from '@/components/layout/Header';
import MyStores from '@/features/stores/MyStores';
import EntriesExitsReport from '@/features/reports/EntriesExitsReport';
import Banca from '@/features/banca/Banca';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import SafeHands from '@/features/safe-hands/SafeHands';
import PublicValidation from '@/features/safe-hands/PublicValidation';
import Schedules from '@/features/schedules/Schedules';

const App: React.FC = () => {
  const {
    auth, employees, restaurants, filteredEmployees,
    selectedMonth, isSidebarOpen, syncStatus,
    handleLogin, handleLogout, setSelectedMonth, setIsSidebarOpen,
    refreshData, initData, loadMonthly
  } = useAppStore();

  useEffect(() => {
    const load = async () => {
      await initData();
    };
    void load();
    const interval = setInterval(() => {
      if (useAppStore.getState().auth.isAuthenticated) {
        void useAppStore.getState().loadMonthly();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [initData]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      void loadMonthly();
    }
  }, [selectedMonth, auth.isAuthenticated, loadMonthly]);

  if (!auth.isAuthenticated) {
    return (
      <Routes>
        <Route path="/verify" element={<PublicValidation />} />
        <Route path="/verify/:id" element={<PublicValidation />} />
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Routes>
            {/* Helper: verifica si el usuario actual puede acceder a un módulo */}
            {(() => {
              const user = auth.user!;
              const isGuest = user.role === UserRole.GUEST;
              const guestMods: string[] = isGuest
                ? (user.allowedModules?.length ? user.allowedModules : ['banca'])
                : [];
              const guestCan = (mod: string) => isGuest && guestMods.includes(mod);
              const nonGuest = (roles: UserRole[]) => !isGuest && roles.includes(user.role);

              // Redirect destino para GUEST: primer módulo habilitado
              const MODULE_ORDER = ['dashboard', 'my-stores', 'entries-exits', 'banca', 'safe-hands'];
              const guestHome = MODULE_ORDER.find(m => guestMods.includes(m)) ?? 'banca';

              return (
                <>
                  {(nonGuest([UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.SPECIALIST]) || guestCan('dashboard')) && (
                    <Route path="/dashboard" element={<Dashboard />} />
                  )}
                  {(nonGuest([UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER, UserRole.SPECIALIST]) || guestCan('my-stores')) && (
                    <Route path="/my-stores" element={<MyStores />} />
                  )}
                  {(nonGuest([UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR]) || guestCan('entries-exits')) && (
                    <Route path="/entries-exits" element={<EntriesExitsReport />} />
                  )}
                  {(nonGuest([UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER]) || isGuest) && (
                    <Route path="/banca" element={<Banca />} />
                  )}
                  {(nonGuest([UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR]) || guestCan('safe-hands')) && (
                    <Route path="/safe-hands" element={<SafeHands />} />
                  )}
                  {nonGuest([UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER]) && (
                    <Route path="/schedules" element={<Schedules />} />
                  )}
                  {nonGuest([UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR]) && (
                    <Route path="/admin" element={<AdminPanel />} />
                  )}
                  <Route path="/verify" element={<PublicValidation />} />
                  <Route path="/verify/:id" element={<PublicValidation />} />
                  <Route path="*" element={<Navigate to={isGuest ? `/${guestHome}` : '/dashboard'} replace />} />
                </>
              );
            })()}
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
