import React from 'react';
import { Globe } from 'lucide-react';
import { HierarchyData, Restaurant } from '@/types';

interface Props {
  hierarchy: HierarchyData;
  restaurants: Restaurant[];
}

export const HierarchyViewer: React.FC<Props> = ({ hierarchy, restaurants }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hierarchy.regions.map(region => (
          <div key={region.name} className="bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-xl shadow-lg">
                  <Globe className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black uppercase italic tracking-tight">{region.name}</h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{region.zones.length} Zonas</span>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {region.zones.map(zone => (
                <div key={zone.name} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-800 uppercase italic">{zone.name}</span>
                    <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{zone.restaurantIds.length} Tiendas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {zone.restaurantIds.map(rid => {
                      const rest = restaurants.find(r => r.id === rid);
                      return (
                        <div key={rid} className="group relative">
                          <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200 cursor-default hover:bg-slate-900 hover:text-white transition-all">
                            {rid}
                          </span>
                          {rest && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 text-white text-[8px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10 uppercase italic">
                              {rest.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
