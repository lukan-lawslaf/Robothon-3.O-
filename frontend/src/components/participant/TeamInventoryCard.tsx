import React, { useState, useEffect, useMemo } from 'react';
import { inventoryService, TeamInventoryResponse, TeamInventoryItem } from '../../services/inventoryService';
import {
  Boxes,
  Package,
  Layers,
  Clock,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Zap,
  Wrench,
  Disc,
  Sliders,
  CheckCircle2,
  Info
} from 'lucide-react';

interface Props {
  teamId?: string;
  teamName?: string;
}

export const TeamInventoryCard: React.FC<Props> = ({ teamId, teamName }) => {
  const [inventory, setInventory] = useState<TeamInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      // Backend automatically resolves team from session context for Team Leaders
      const res = await inventoryService.getTeamInventory(teamId);
      setInventory(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load team inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [teamId]);

  // Real-time listener for allocations
  useEffect(() => {
    const sse = new EventSource('/api/events');
    sse.addEventListener('INVENTORY_UPDATED', () => {
      loadData();
    });
    return () => sse.close();
  }, [teamId]);

  // Group items by category
  const groupedByCategory = useMemo(() => {
    if (!inventory?.items) return {};
    const map: Record<string, TeamInventoryItem[]> = {};
    for (const item of inventory.items) {
      const cat = item.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return map;
  }, [inventory?.items]);

  const categories = Object.keys(groupedByCategory);

  const getCategoryIcon = (cat: string) => {
    const lower = cat.toLowerCase();
    if (/motor/i.test(lower)) return <Zap size={16} className="text-[#ea580c]" />;
    if (/wheel/i.test(lower)) return <Disc size={16} className="text-amber-500" />;
    if (/power|battery/i.test(lower)) return <Zap size={16} className="text-emerald-500" />;
    if (/sensor|electron/i.test(lower)) return <Cpu size={16} className="text-blue-500" />;
    if (/tool/i.test(lower)) return <Wrench size={16} className="text-stone-400" />;
    return <Package size={16} className="text-orange-400" />;
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-[#ea580c]">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-[#1c140e]">
                My Team Hardware Inventory
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-600" />
                <span>View Only</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              Physical parts & components allocated to {teamName || inventory?.teamName || 'your team'} by the OC.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono hidden sm:block">
            <span className="text-xs text-stone-400">Total Units: </span>
            <strong className="text-sm text-[#1c140e] font-black">{inventory?.totalUnits || 0}</strong>
          </div>
          <button
            onClick={loadData}
            title="Refresh inventory"
            className="p-2 rounded-xl border border-stone-200 text-stone-500 hover:text-[#ea580c] transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Content */}
      {loading && !inventory ? (
        <div className="py-8 text-center text-xs font-mono text-stone-400">
          Loading team inventory...
        </div>
      ) : categories.length === 0 ? (
        <div className="py-10 text-center space-y-2 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
          <Boxes className="w-10 h-10 mx-auto text-stone-300" />
          <p className="font-bold text-stone-700 text-sm">No hardware allocated yet.</p>
          <p className="text-xs text-stone-500 font-mono max-w-md mx-auto">
            Physical components will appear here once checked out to your team by the Organizing Committee.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {categories.map(cat => (
              <div key={cat} className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2.5">
                <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                  <div className="flex items-center gap-2 font-bold text-xs font-mono text-[#1c140e] uppercase tracking-wide">
                    {getCategoryIcon(cat)}
                    <span>{cat}</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 font-bold">
                    {groupedByCategory[cat].reduce((sum, item) => sum + item.totalQuantity, 0)} units
                  </span>
                </div>

                <ul className="space-y-1.5 font-mono text-xs">
                  {groupedByCategory[cat].map(item => (
                    <li key={item.inventoryItemId} className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/60 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span className="font-bold text-stone-800">{item.name}</span>
                      </div>
                      <span className="font-black text-sm text-[#ea580c] px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200/50">
                        × {item.totalQuantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-stone-400 border-t border-stone-100">
            <span className="flex items-center gap-1">
              <Info size={12} />
              <span>Allocated quantities verified by Robothon Technical Committee.</span>
            </span>
            <span>Live Sync Active</span>
          </div>
        </div>
      )}
    </div>
  );
};
