import React, { useState } from 'react';
import { dataService } from '@/services/dataService';
import { UserRole, User, HierarchyData, Restaurant } from '@/types';
import { Shield, AlertCircle, CheckCircle2, X, Users } from 'lucide-react';

import { DataUploader } from './components/DataUploader';
import { SettlementManager } from './components/SettlementManager';
import { HierarchyViewer } from './components/HierarchyViewer';
import { SstConfig } from './components/SstConfig';
import { UserManagement } from './components/UserManagement';

import { useAppStore } from '@/store/useAppStore';

const AdminPanel: React.FC = () => {
  const { auth, refreshData: onEmployeesImported } = useAppStore();
  const currentUser = auth.user!;
  const [activeSubTab, setActiveSubTab] = useState<'import' | 'users' | 'hierarchy' | 'settlement' | 'sst-config'>(
    currentUser.role === UserRole.ADMIN ? 'import' : 'users'
  );
  const [importStatus, setImportStatus] = useState<{ message: string, isError: boolean } | null>(null);

  const [hierarchy, setHierarchy] = useState<HierarchyData>(dataService.getHierarchy());
  const [users, setUsers] = useState<User[]>(dataService.getUsers());
  const [restaurants, setRestaurants] = useState<Restaurant[]>(dataService.getRestaurants());

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg">
              {currentUser.role === UserRole.ADMIN ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic leading-none">
                {currentUser.role === UserRole.ADMIN ? 'Panel Administración' : 'Gestión de Equipo'}
              </h2>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentUser.role === UserRole.ADMIN && (
                  <>
                    <button onClick={() => setActiveSubTab('import')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'import' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Carga Excel</button>
                    <button onClick={() => setActiveSubTab('sst-config')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'sst-config' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Configuración Guías Mensual</button>
                    <button onClick={() => setActiveSubTab('settlement')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'settlement' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Asentar Notas</button>
                    <button onClick={() => setActiveSubTab('hierarchy')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'hierarchy' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Estructura</button>
                  </>
                )}
                <button onClick={() => setActiveSubTab('users')} className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition ${activeSubTab === 'users' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>Gestión de Usuarios</button>
              </div>
            </div>
          </div>
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

        {/* SST Config Component */}
        {activeSubTab === 'sst-config' && currentUser.role === UserRole.ADMIN && (
          <SstConfig hierarchy={hierarchy} setHierarchy={setHierarchy} setImportStatus={setImportStatus} />
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

      </div>
    </div>
  );
};

export default AdminPanel;
