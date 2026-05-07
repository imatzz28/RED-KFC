
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
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

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
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      <div className={`fixed bottom-6 left-6 z-[200] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 transition-all duration-500 border-2 ${syncStatus === 'syncing' ? 'bg-slate-900 border-red-500 text-white animate-pulse' :
        syncStatus === 'online' ? 'bg-white border-emerald-500 text-emerald-600' :
          'bg-white border-red-500 text-red-600'
        }`}>
        {syncStatus === 'syncing' ? <RefreshCw className="w-3 h-3 animate-spin" /> :
          syncStatus === 'online' ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
        {syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'online' ? 'Nube Conectada' : 'Modo Offline'}
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-stores" element={<MyStores />} />
            {(auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.COORDINATOR) && (
              <Route path="/entries-exits" element={<EntriesExitsReport />} />
            )}
            {(auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.COORDINATOR || auth.user?.role === UserRole.LIDER) && (
              <Route path="/banca" element={<Banca />} />
            )}
            {(auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.COORDINATOR) && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
