import React, { useState } from 'react';
import { dataService } from '@/services/dataService';
import { UserRole, User, HierarchyData, Restaurant } from '@/types';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

import { DataUploader } from './components/DataUploader';
import { SettlementManager } from './components/SettlementManager';
import { HierarchyViewer } from './components/HierarchyViewer';
import { SstConfig } from './components/SstConfig';
import { UserManagement } from './components/UserManagement';
import { PulseAdminCategoryManager } from './components/PulseAdminCategoryManager';
import { QuickShortcutsManager } from './components/QuickShortcutsManager';
import { useAppStore } from '@/store/useAppStore';

const AdminPanel: React.FC = () => {
  const { auth, refreshData: onEmployeesImported } = useAppStore();
  const currentUser = auth.user!;
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'users' | 'hierarchy' | 'settlement' | 'pulse' | 'shortcuts'>(
    currentUser.role === UserRole.ADMIN ? 'import' : 'users'
  );
  const [importStatus, setImportStatus] = useState<{ message: string, isError: boolean } | null>(null);

  const [hierarchy, setHierarchy] = useState<HierarchyData>(dataService.getHierarchy());
  const [users, setUsers] = useState<User[]>(dataService.getUsers());
  const [restaurants, setRestaurants] = useState<Restaurant[]>(dataService.getRestaurants());

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
        {/* Pestañas alineadas a la izquierda */}
        <div className="flex flex-wrap items-center gap-2.5 pb-6 border-b border-slate-100">
          {currentUser.role === UserRole.ADMIN && (
            <>
              <button
                onClick={() => setActiveSubTab('import')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-widest transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                  activeSubTab === 'import'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-900 text-slate-700 hover:text-white border-slate-200 hover:border-slate-800 hover:shadow-md'
                }`}
              >
                Carga Excel
              </button>
              <button
                onClick={() => setActiveSubTab('settlement')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-widest transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                  activeSubTab === 'settlement'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-900 text-slate-700 hover:text-white border-slate-200 hover:border-slate-800 hover:shadow-md'
                }`}
              >
                Asentar Notas
              </button>
              <button
                onClick={() => setActiveSubTab('hierarchy')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-widest transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                  activeSubTab === 'hierarchy'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-900 text-slate-700 hover:text-white border-slate-200 hover:border-slate-800 hover:shadow-md'
                }`}
              >
                Estructura
              </button>
              <button
                onClick={() => setActiveSubTab('pulse')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-widest transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                  activeSubTab === 'pulse'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-900 text-slate-700 hover:text-white border-slate-200 hover:border-slate-800 hover:shadow-md'
                }`}
              >
                Pulse (Categorías)
              </button>
              <button
                onClick={() => setActiveSubTab('shortcuts')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-widest transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                  activeSubTab === 'shortcuts'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-900 text-slate-700 hover:text-white border-slate-200 hover:border-slate-800 hover:shadow-md'
                }`}
              >
                Accesos Directos
              </button>
            </>
          )}
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10.5px] font-black uppercase tracking-widest transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-900 text-slate-700 hover:text-white border-slate-200 hover:border-slate-800 hover:shadow-md'
            }`}
          >
            Gestión de Usuarios
          </button>
        </div>

        {importStatus && (
          <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${importStatus.isError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {importStatus.isError ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <p className="text-[10px] font-black uppercase tracking-widest">{importStatus.message}</p>
            <button onClick={() => setImportStatus(null)} className="ml-auto p-1 hover:bg-black/5 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Carga Excel Component */}
        {activeSubTab === 'import' && currentUser.role === UserRole.ADMIN && (
          <DataUploader
            setImportStatus={setImportStatus}
            onEmployeesImported={onEmployeesImported}
            setHierarchy={setHierarchy}
            setRestaurants={setRestaurants}
          />
        )}

        {/* Settlement Manager Component */}
        {activeSubTab === 'settlement' && currentUser.role === UserRole.ADMIN && (
          <SettlementManager hierarchy={hierarchy} setHierarchy={setHierarchy} setImportStatus={setImportStatus} />
        )}

        {/* Hierarchy Viewer Component */}
        {activeSubTab === 'hierarchy' && currentUser.role === UserRole.ADMIN && (
          <HierarchyViewer hierarchy={hierarchy} restaurants={restaurants} />
        )}

        {/* User Management Component */}
        {activeSubTab === 'users' && (
          <UserManagement
            currentUser={currentUser}
            users={users}
            setUsers={setUsers}
            hierarchy={hierarchy}
            restaurants={restaurants}
            setImportStatus={setImportStatus}
          />
        )}

        {/* Pulse Category Manager Component */}
        {activeSubTab === 'pulse' && currentUser.role === UserRole.ADMIN && (
          <PulseAdminCategoryManager setImportStatus={setImportStatus} />
        )}

        {/* Quick Shortcuts Manager Component */}
        {activeSubTab === 'shortcuts' && currentUser.role === UserRole.ADMIN && (
          <QuickShortcutsManager setImportStatus={setImportStatus} />
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
