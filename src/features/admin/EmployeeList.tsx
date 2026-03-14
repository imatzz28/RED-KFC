
import React, { useState, useMemo } from 'react';
import { Employee, Restaurant, JobHierarchy, User, UserRole } from '@/types';
import { Search, Edit3, Users } from 'lucide-react';
import GradeEditor from '@/features/dashboard/GradeEditor';
import { APPROVAL_THRESHOLD, TOTAL_CATEGORIES_COUNT } from '@/utils/constants';
import { dataService } from '@/services/dataService';

interface EmployeeListProps {
  employees: Employee[];
  restaurants: Restaurant[];
  selectedMonth: string;
  user: User;
  onUpdate: () => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, restaurants, selectedMonth, user, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStore, setFilterStore] = useState('all');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const dynamicRegions = useMemo(() => Array.from(new Set(restaurants.map(r => r.region))).filter(Boolean).sort(), [restaurants]);
  const dynamicZones = useMemo(() => {
    let base = restaurants;
    if (filterRegion !== 'all') base = base.filter(r => r.region === filterRegion);
    let zones = Array.from(new Set(base.map(r => r.zone))).filter(Boolean).sort();
    if (user.role === UserRole.SPECIALIST) zones = zones.filter(z => user.assignedZones.includes(z));
    return zones;
  }, [restaurants, filterRegion, user]);

  const dynamicStores = useMemo(() => {
    let base = restaurants;
    if (filterRegion !== 'all') base = base.filter(r => r.region === filterRegion);
    if (filterZone !== 'all') base = base.filter(r => r.zone === filterZone);
    if (user.role === UserRole.SPECIALIST) base = base.filter(r => user.assignedRestaurants.includes(r.id) || user.assignedZones.includes(r.zone));
    return base.sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurants, filterRegion, filterZone, user]);

  const filteredAndSorted = useMemo(() => {
    const result = employees.filter(e => {
      if (user.role === UserRole.SPECIALIST && !e.active) return false;
      const store = restaurants.find(r => r.id === e.restaurant_id);
      const matchSearch = searchTerm === '' || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.id.includes(searchTerm);
      const matchRegion = filterRegion === 'all' || store?.region === filterRegion;
      const matchZone = filterZone === 'all' || e.zone === filterZone;
      const matchStore = filterStore === 'all' || e.restaurant_id === filterStore;
      return matchSearch && matchRegion && matchZone && matchStore;
    });
    return result.sort((a, b) => (JobHierarchy[a.title] || 99) - (JobHierarchy[b.title] || 99));
  }, [employees, searchTerm, filterRegion, filterZone, filterStore, user, restaurants]);

  const getStatus = (employeeId: string) => {
    // Usamos notas efectivas (arrastre) para mostrar el estado actual
    const effectiveGrades = dataService.getEffectiveGrades(employeeId, selectedMonth);
    if (effectiveGrades.length === 0) return 'PENDING';
    const sum = effectiveGrades.reduce((s, g) => s + g.score, 0);
    const avg = sum / TOTAL_CATEGORIES_COUNT;
    return avg >= APPROVAL_THRESHOLD ? 'APPROVED' : 'FAILED';
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center uppercase italic shrink-0"><Users className="w-5 h-5 mr-3 text-red-600" /> Personal KFC</h2>
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Buscar personal..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <select className="p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}><option value="all">Region: Todas</option>{dynamicRegions.map(r => <option key={r} value={r}>{r}</option>)}</select>
           <select className="p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase" value={filterZone} onChange={(e) => setFilterZone(e.target.value)}><option value="all">Zona: Todas</option>{dynamicZones.map(z => <option key={z} value={z}>{z}</option>)}</select>
           <select className="p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase" value={filterStore} onChange={(e) => setFilterStore(e.target.value)}><option value="all">Tienda: Todas</option>{dynamicStores.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tienda</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Certificación</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredAndSorted.map(emp => {
              const status = getStatus(emp.id);
              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4"><p className="font-black text-slate-800 text-sm uppercase">{emp.name}</p><p className="text-[9px] text-slate-400 font-black uppercase">{emp.title}</p></td>
                  <td className="px-8 py-4 text-xs font-black text-slate-600 uppercase">{restaurants.find(r => r.id === emp.restaurant_id)?.name}</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full ${status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                      {status === 'APPROVED' ? 'Certificado' : status === 'FAILED' ? 'Reprobado' : 'Sin Nota'}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center"><button onClick={() => setEditingEmployee(emp)} className="p-3 text-slate-300 hover:text-red-600 transition-all"><Edit3 className="w-5 h-5" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editingEmployee && <GradeEditor employee={editingEmployee} month={selectedMonth} onClose={() => { setEditingEmployee(null); onUpdate(); }} />}
    </div>
  );
};

export default EmployeeList;
