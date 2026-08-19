import React, { useEffect, lazy, Suspense } from 'react';
import { UserRole } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { ModuleLoader } from '@/components/common/ModuleLoader';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AlertTriangle, Info } from 'lucide-react';

// Carga bajo demanda (Code Splitting) por ruta
const Login = lazy(() => import('@/features/auth/Login'));
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
const AdminPanel = lazy(() => import('@/features/admin/AdminPanel'));
const MyStores = lazy(() => import('@/features/stores/MyStores'));
const EntriesExitsReport = lazy(() => import('@/features/reports/EntriesExitsReport'));
const Banca = lazy(() => import('@/features/banca/Banca'));
const SafeHands = lazy(() => import('@/features/safe-hands/SafeHands'));
const PublicValidation = lazy(() => import('@/features/safe-hands/PublicValidation'));
const Schedules = lazy(() => import('@/features/schedules/Schedules'));
const PulseModule = lazy(() => import('@/features/pulse/PulseModule'));
const PublicSurveyRunner = lazy(() => import('@/features/pulse/PublicSurveyRunner').then(m => ({ default: m.PublicSurveyRunner })));

const App: React.FC = () => {
  const {
    auth,
    isSidebarOpen,
    handleLogin,
    setIsSidebarOpen,
    initData,
    dialog,
    closeDialog
  } = useAppStore();

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const load = async () => {
      await initData();
    };
    void load();
  }, [initData, auth.isAuthenticated]);

  if (!auth.isAuthenticated) {
    return (
      <ErrorBoundary fallbackTitle="Error al cargar la página">
        <Suspense fallback={<ModuleLoader message="Cargando acceso..." />}>
          <Routes>
            <Route path="/verify" element={<PublicValidation />} />
            <Route path="/verify/:id" element={<PublicValidation />} />
            <Route path="/pulse/play/:surveyId" element={<PublicSurveyRunner />} />
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
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
          <ErrorBoundary fallbackTitle="Error al cargar el módulo">
            <Suspense fallback={<ModuleLoader />}>
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
                  const MODULE_ORDER = ['dashboard', 'my-stores', 'entries-exits', 'banca', 'safe-hands', 'schedules', 'encuestas'];
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
                      {(nonGuest([UserRole.ADMIN, UserRole.COORDINATOR, UserRole.LIDER]) || guestCan('banca')) && (
                        <Route path="/banca" element={<Banca />} />
                      )}
                      {(nonGuest([UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR]) || guestCan('safe-hands')) && (
                        <Route path="/safe-hands" element={<SafeHands />} />
                      )}
                      {(nonGuest([UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR, UserRole.SPECIALIST]) || guestCan('schedules')) && (
                        <Route path="/schedules" element={<Schedules />} />
                      )}
                      {(nonGuest([UserRole.ADMIN, UserRole.LIDER, UserRole.COORDINATOR]) || guestCan('encuestas')) && (
                        <>
                          <Route path="/pulse" element={<PulseModule />} />
                          <Route path="/pulse/play/:surveyId" element={<PublicSurveyRunner />} />
                        </>
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
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global custom premium dialog modal */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-800/80 rounded-[32px] p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden animate-in scale-in duration-300">
            {/* Red header accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            {/* Title / Header */}
            <div className="flex items-center gap-3.5 mb-5 relative z-10">
              <div className={`p-2.5 rounded-xl shrink-0 ${dialog.type === 'confirm' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                {dialog.type === 'confirm' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <h4 className="text-base font-black uppercase italic tracking-tighter text-white">
                {dialog.title || (dialog.type === 'confirm' ? 'Confirmación' : 'Notificación')}
              </h4>
            </div>

            {/* Message Body */}
            <div className="mb-8 relative z-10">
              <p className="text-slate-300 text-xs font-bold leading-relaxed whitespace-pre-line uppercase tracking-wide">
                {dialog.message}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 relative z-10">
              {dialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    closeDialog();
                    if (dialog.onCancel) dialog.onCancel();
                  }}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  closeDialog();
                  if (dialog.onConfirm) dialog.onConfirm();
                }}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/25"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
