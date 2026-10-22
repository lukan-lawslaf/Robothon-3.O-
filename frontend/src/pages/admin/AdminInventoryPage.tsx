import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  inventoryService,
  InventoryData,
  InventoryItem,
  InventoryAllocation,
  InventoryAdjustment
} from '../../services/inventoryService';
import { getStoredTeams } from '../../services/stateStore';
import { MockTeam, getTeamLeaderName } from '../../mockData';
import { useAccount, isAdmin } from '../../services/authService';
import {
  Boxes,
  Upload,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  PackageCheck,
  PackageMinus,
  FileSpreadsheet,
  History,
  Layers,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Sparkles,
  SlidersHorizontal,
  X,
  FileText
} from 'lucide-react';

export const AdminInventoryPage: React.FC = () => {
  const account = useAccount();
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [teams, setTeams] = useState<MockTeam[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [distFilter, setDistFilter] = useState<'ALL' | 'DISTRIBUTED' | 'NOT_DISTRIBUTED'>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'AVAILABLE' | 'DEPLETED'>('ALL');
  const [activeView, setActiveView] = useState<'catalog' | 'allocations' | 'adjustments'>('catalog');

  // Modals state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Allocate form state
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [allocateQty, setAllocateQty] = useState<number>(1);
  const [allocateNotes, setAllocateNotes] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState('');

  // Adjust form state
  const [adjustTeamId, setAdjustTeamId] = useState('');
  const [adjustItemId, setAdjustItemId] = useState('');
  const [adjustDelta, setAdjustDelta] = useState<number>(-1);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const inv = await inventoryService.getInventory();
      setData(inv);
      setTeams(getStoredTeams());
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Listen to SSE events for real-time inventory updates
  useEffect(() => {
    const sse = new EventSource('/api/events');
    sse.addEventListener('INVENTORY_UPDATED', () => {
      loadInventory();
    });
    return () => sse.close();
  }, []);

  // Distinct categories
  const categories = useMemo(() => {
    if (!data?.items) return [];
    const set = new Set<string>();
    data.items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [data?.items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchDist = distFilter === 'ALL' ||
        (distFilter === 'DISTRIBUTED' && item.isDistributed) ||
        (distFilter === 'NOT_DISTRIBUTED' && !item.isDistributed);
      const matchStock = stockFilter === 'ALL' ||
        (stockFilter === 'AVAILABLE' && item.availableQuantity > 0) ||
        (stockFilter === 'DEPLETED' && item.availableQuantity <= 0);
      return matchSearch && matchCat && matchDist && matchStock;
    });
  }, [data?.items, searchQuery, categoryFilter, distFilter, stockFilter]);

  // Selected item for allocate
  const currentAllocateItem = useMemo(() => {
    return data?.items.find(i => i.id === selectedItemId);
  }, [data?.items, selectedItemId]);

  // Team currently allocated items
  const teamCurrentAllocations = useMemo(() => {
    if (!selectedTeamId || !data?.allocations) return [];
    const map = new Map<string, { itemName: string; category: string; quantity: number }>();
    data.allocations
      .filter(a => a.teamId === selectedTeamId)
      .forEach(a => {
        if (!map.has(a.inventoryItemId)) {
          map.set(a.inventoryItemId, { itemName: a.itemName, category: a.itemCategory, quantity: 0 });
        }
        map.get(a.inventoryItemId)!.quantity += (a.quantity || 0);
      });
    return Array.from(map.values()).filter(x => x.quantity > 0);
  }, [selectedTeamId, data?.allocations]);

  // Handle Excel file selection & instant preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Simple preview of first 8 non-empty rows
        const rows = rawJson.filter(r => Array.isArray(r) && r.some(c => c !== undefined && c !== '')).slice(0, 10);
        setImportPreview(rows);
      } catch (err) {
        console.warn('Preview error:', err);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const res = await inventoryService.importInventory({
            fileBase64: base64,
            fileName: importFile.name
          });
          setImportResult(res.summary);
          setSuccessNotice(`Successfully imported ${res.summary.importedCount} new items, updated ${res.summary.updatedCount} items!`);
          await loadInventory();
        } catch (err: any) {
          setError(err.message || 'Excel import failed.');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsDataURL(importFile);
    } catch (err: any) {
      setError(err.message || 'Failed to read file.');
      setImporting(false);
    }
  };

  // Submit Allocate
  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllocateError('');
    if (!selectedTeamId) {
      setAllocateError('Please select a team.');
      return;
    }
    if (!selectedItemId) {
      setAllocateError('Please select a component.');
      return;
    }
    if (allocateQty <= 0) {
      setAllocateError('Quantity must be at least 1.');
      return;
    }
    if (currentAllocateItem && allocateQty > currentAllocateItem.availableQuantity) {
      setAllocateError(`Only ${currentAllocateItem.availableQuantity} units available.`);
      return;
    }

    setAllocating(true);
    try {
      const res = await inventoryService.allocate({
        teamId: selectedTeamId,
        inventoryItemId: selectedItemId,
        quantity: allocateQty,
        notes: allocateNotes
      });
      setSuccessNotice(`Allocated ${allocateQty}x "${res.item.name}" to ${res.allocation.teamName}!`);
      setShowAllocateModal(false);
      setAllocateQty(1);
      setAllocateNotes('');
      await loadInventory();
    } catch (err: any) {
      setAllocateError(err.message || 'Allocation failed.');
    } finally {
      setAllocating(false);
    }
  };

  // Submit Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError('');
    if (!adjustTeamId || !adjustItemId) {
      setAdjustError('Please select team and component.');
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('Please enter a reason for this inventory correction.');
      return;
    }
    if (adjustDelta === 0) {
      setAdjustError('Delta cannot be 0.');
      return;
    }

    setAdjusting(true);
    try {
      const res = await inventoryService.adjust({
        teamId: adjustTeamId,
        inventoryItemId: adjustItemId,
        delta: adjustDelta,
        reason: adjustReason.trim()
      });
      setSuccessNotice(`Inventory correction applied: ${adjustDelta > 0 ? '+' : ''}${adjustDelta} for ${res.adjustment.teamName}.`);
      setShowAdjustModal(false);
      setAdjustReason('');
      await loadInventory();
    } catch (err: any) {
      setAdjustError(err.message || 'Adjustment failed.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleClearAllInventory = async () => {
    if (!window.confirm('Are you sure you want to completely remove ALL inventory components, stock records, and history from the database? This cannot be undone.')) {
      return;
    }
    try {
      setClearing(true);
      setError('');
      const res = await inventoryService.clearAllInventory();
      setSuccessNotice(res.message || 'All inventory items and history have been wiped clean.');
      await loadInventory();
    } catch (err: any) {
      setError(err.message || 'Failed to clear inventory.');
    } finally {
      setClearing(false);
    }
  };

  const handleResetAllocations = async () => {
    setResetting(true);
    setError('');
    try {
      const res = await inventoryService.resetAllAllocations();
      setSuccessNotice(res.message || 'All team allocations have been reset to 0 and logs cleared.');
      setShowResetModal(false);
      await loadInventory();
    } catch (err: any) {
      setError(err.message || 'Failed to reset allocations.');
    } finally {
      setResetting(false);
    }
  };

  const summary = data?.summary || {
    totalItems: 0,
    totalUnits: 0,
    availableUnits: 0,
    allocatedUnits: 0,
    distributedItems: 0
  };

  return (
    <div className="min-h-screen bg-[#FEF3E2] text-[#251306] p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Breadcrumb & Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-1">
              <Link to="/admin-dashboard" className="hover:text-[#ea580c] transition-colors">Admin Portal</Link>
              <ChevronRight size={12} />
              <span className="text-[#ea580c] font-bold">Inventory Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1c140e] flex items-center gap-3">
              <Boxes className="w-8 h-8 text-[#ea580c]" />
              Robothon Parts Inventory
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 font-mono mt-1">
              Hardware tracking, Excel stock import, team allocations & audit trails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {account?.role === 'SUPER_ADMIN' && (
              <>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer"
                  title="Super Admin Only: Reset all team allocations"
                >
                  <RotateCcw size={14} className="text-red-600" />
                  <span>Reset All Allocations</span>
                </button>

                <button
                  onClick={handleClearAllInventory}
                  disabled={loading || clearing || (!data?.items.length && !data?.allocations.length)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-mono text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                  title="Super Admin Only: Wipe all inventory parts, stock, and history from database"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Clear Inventory</span>
                </button>

                <button
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview([]);
                    setImportResult(null);
                    setShowImportModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c140e] hover:bg-black text-white text-xs font-mono font-bold transition-all shadow-sm cursor-pointer"
                  title="Super Admin Only: Import Master Excel"
                >
                  <Upload size={14} className="text-[#ea580c]" />
                  <span>Import Excel</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                setAllocateError('');
                const eligibleTeams = teams.filter(t => !t.isDisqualified && !t.debarred && t.qualificationStatus !== 'DEBARRED' && (t as any).status !== 'DISQUALIFIED');
                if (eligibleTeams.length > 0) setSelectedTeamId(eligibleTeams[0].id);
                const distItems = (data?.items || []).filter(i => i.isDistributed !== false && i.availableQuantity > 0);
                if (distItems.length > 0) {
                  setSelectedItemId(distItems[0].id);
                } else if (data?.items?.length) {
                  setSelectedItemId(data.items[0].id);
                }
                setShowAllocateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#d4621a] text-white text-xs font-mono font-bold transition-all shadow-sm cursor-pointer"
            >
              <PlusCircle size={14} />
              <span>Allocate to Team</span>
            </button>

            <button
              onClick={loadInventory}
              title="Refresh"
              className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-[#ea580c] transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Alert Notices */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}

        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice('')} className="text-emerald-500 hover:text-emerald-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider font-semibold">Total Catalog</div>
            <div className="text-2xl font-black text-[#1c140e] mt-1">{summary.totalItems} <span className="text-xs font-normal text-stone-400 font-mono">items</span></div>
            <div className="text-[11px] font-mono text-stone-400 mt-0.5">{summary.totalUnits} total units</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider font-semibold flex items-center gap-1">
              <PackageCheck size={12} />
              <span>Available Units</span>
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{summary.availableUnits}</div>
            <div className="text-[11px] font-mono text-stone-400 mt-0.5">Ready for distribution</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-[#ea580c] uppercase tracking-wider font-semibold flex items-center gap-1">
              <PackageMinus size={12} />
              <span>Allocated Units</span>
            </div>
            <div className="text-2xl font-black text-[#ea580c] mt-1">{summary.allocatedUnits}</div>
            <div className="text-[11px] font-mono text-stone-400 mt-0.5">Held by teams</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <div className="text-[10px] font-mono text-blue-600 uppercase tracking-wider font-semibold">To Distribute</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{summary.distributedItems}</div>
            <div className="text-[11px] font-mono text-stone-400 mt-0.5">Flagged in Excel</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider font-semibold">Total Teams</div>
            <div className="text-2xl font-black text-[#1c140e] mt-1">{teams.length}</div>
            <div className="text-[11px] font-mono text-stone-400 mt-0.5">Active platforms</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
          <button
            onClick={() => setActiveView('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeView === 'catalog'
                ? 'bg-[#1c140e] text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Boxes size={14} />
            <span>Master Inventory ({data?.items.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveView('allocations')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeView === 'allocations'
                ? 'bg-[#1c140e] text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <History size={14} />
            <span>Distribution Ledger ({data?.allocations.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveView('adjustments')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeView === 'adjustments'
                ? 'bg-[#1c140e] text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Corrections Log ({data?.adjustments.length || 0})</span>
          </button>
        </div>

        {/* CATALOG VIEW */}
        {activeView === 'catalog' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[220px] relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search parts by name or category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent bg-stone-50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Distribution Filter */}
                <select
                  value={distFilter}
                  onChange={e => setDistFilter(e.target.value as any)}
                  className="py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="ALL">All Distribution Flags</option>
                  <option value="DISTRIBUTED">To Distribute (Yes)</option>
                  <option value="NOT_DISTRIBUTED">Do Not Distribute</option>
                </select>

                {/* Stock Filter */}
                <select
                  value={stockFilter}
                  onChange={e => setStockFilter(e.target.value as any)}
                  className="py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="ALL">All Stock Levels</option>
                  <option value="AVAILABLE">In Stock Only</option>
                  <option value="DEPLETED">Depleted (0 left)</option>
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                      <th className="py-3 px-4">Component / Part</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Total Stock</th>
                      <th className="py-3 px-4 text-center">Available</th>
                      <th className="py-3 px-4 text-center">Allocated</th>
                      <th className="py-3 px-4 text-center">To Distribute</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-stone-400">
                          <Boxes className="w-12 h-12 mx-auto text-stone-300 mb-2" />
                          <p className="font-bold text-stone-600">No inventory parts found.</p>
                          <p className="text-[11px] mt-1">Upload an Excel file or refine your search query.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map(item => {
                        const isDepleted = item.availableQuantity <= 0;
                        const pctAvail = item.totalQuantity > 0 ? (item.availableQuantity / item.totalQuantity) * 100 : 0;
                        return (
                          <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#1c140e] flex items-center gap-2">
                              <span>{item.name}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-stone-100 text-stone-700 border border-stone-200">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-stone-700">
                              {item.totalQuantity}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                isDepleted
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isDepleted ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                {item.availableQuantity}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-[#ea580c]">
                              {item.allocatedQuantity}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {item.isDistributed ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                  <CheckCircle2 size={13} />
                                  <span>Yes</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-stone-400 text-[11px]">
                                  <XCircle size={13} />
                                  <span>No</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button
                                disabled={item.availableQuantity <= 0}
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].id);
                                  setAllocateQty(1);
                                  setAllocateError('');
                                  setShowAllocateModal(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#ea580c] hover:bg-[#d4621a] disabled:opacity-40 text-white font-bold text-[11px] transition-all cursor-pointer disabled:cursor-not-allowed"
                              >
                                Allocate
                              </button>

                              <button
                                onClick={() => {
                                  setAdjustItemId(item.id);
                                  if (teams.length > 0 && !adjustTeamId) setAdjustTeamId(teams[0].id);
                                  setAdjustDelta(-1);
                                  setAdjustReason('');
                                  setAdjustError('');
                                  setShowAdjustModal(true);
                                }}
                                className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold text-[11px] transition-all cursor-pointer"
                              >
                                Correct
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ALLOCATIONS HISTORY LEDGER */}
        {activeView === 'allocations' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#1c140e] flex items-center gap-2">
                  <History size={16} className="text-[#ea580c]" />
                  Physical Allocation Audit Ledger
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  Complete trace of each physical part handed to competitors.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Component</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3">Allocated By</th>
                    <th className="py-2.5 px-3">Notes / Context</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {!data?.allocations || data.allocations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-stone-400">
                        No allocations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data.allocations.map(alloc => (
                      <tr key={alloc.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 text-stone-500">
                          {new Date(alloc.allocatedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#1c140e]">
                          {alloc.teamName}
                        </td>
                        <td className="py-2.5 px-3 text-stone-800 font-medium">
                          {alloc.itemName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-stone-100 text-stone-600">
                            {alloc.itemCategory}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-center font-bold ${
                          alloc.quantity < 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}>
                          {alloc.quantity > 0 ? `+${alloc.quantity}` : alloc.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">
                          {alloc.adminName || alloc.allocatedBy}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 text-[11px]">
                          {alloc.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADJUSTMENTS CORRECTIONS LOG */}
        {activeView === 'adjustments' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#1c140e] flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-[#ea580c]" />
                  Inventory Corrections & Audit Log
                </h3>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  Traceability of count corrections, returned parts, and admin reconciliations.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 uppercase tracking-wider border-b border-stone-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-3">Component</th>
                    <th className="py-2.5 px-3 text-center">Previous Qty</th>
                    <th className="py-2.5 px-3 text-center">Adjustment</th>
                    <th className="py-2.5 px-3 text-center">New Qty</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {!data?.adjustments || data.adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-stone-400">
                        No manual corrections recorded. All allocations reflect standard issuance.
                      </td>
                    </tr>
                  ) : (
                    data.adjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 text-stone-500">
                          {new Date(adj.adjustedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#1c140e]">
                          {adj.teamName}
                        </td>
                        <td className="py-2.5 px-3 text-stone-800">
                          {adj.itemName}
                        </td>
                        <td className="py-2.5 px-3 text-center text-stone-500">
                          {adj.previousQuantity}
                        </td>
                        <td className={`py-2.5 px-3 text-center font-bold ${
                          adj.adjustedDelta < 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}>
                          {adj.adjustedDelta > 0 ? `+${adj.adjustedDelta}` : adj.adjustedDelta}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#ea580c]">
                          {adj.newQuantity}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-700">
                          {adj.reason}
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">
                          {adj.adminName || adj.adjustedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: EXCEL IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl p-6 sm:p-7 bg-white shadow-2xl border border-stone-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1c140e]">Import Inventory Excel</h3>
                  <p className="text-xs text-stone-500 font-mono">Upload master parts list (.xlsx or .xls)</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-[#ea580c] rounded-2xl p-6 text-center cursor-pointer bg-stone-50 transition-colors"
              >
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-xs font-mono font-bold text-stone-700">
                  {importFile ? importFile.name : 'Click to select Excel file or drag & drop'}
                </p>
                <p className="text-[10px] text-stone-400 font-mono mt-1">
                  Expected columns: "Item", "Quantity", "To Distribute" (as in Bot_Components_With_Distribute.xlsx)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-stone-600">
                    <span className="font-bold">File Content Preview</span>
                    <span>Found rows in sheet</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-xl bg-stone-50 text-[11px] font-mono p-2">
                    <table className="w-full text-left">
                      <tbody>
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className={idx === 1 ? 'font-bold bg-stone-200/60' : ''}>
                            {row.map((cell: any, cidx: number) => (
                              <td key={cidx} className="py-1 px-2 border-b border-stone-200 truncate max-w-[120px]">
                                {String(cell ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Results Banner */}
              {importResult && (
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono space-y-1.5">
                  <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Import Completed Successfully</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-stone-600 pt-1">
                    <div>Imported New: <strong className="text-[#1c140e]">{importResult.importedCount}</strong></div>
                    <div>Updated Existing: <strong className="text-[#1c140e]">{importResult.updatedCount}</strong></div>
                    <div>Skipped Empty: <strong className="text-stone-500">{importResult.skippedCount}</strong></div>
                    <div>Errors: <strong className={importResult.errorsCount > 0 ? 'text-red-600' : 'text-stone-500'}>{importResult.errorsCount}</strong></div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="pt-2 text-red-600 text-[11px]">
                      {importResult.errors.map((e: any, i: number) => (
                        <div key={i}>Row {e.row}: {e.item} ({e.reason})</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-mono text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importing}
                  className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#d4621a] text-white font-mono text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {importing ? 'Processing File...' : 'Confirm & Import to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ALLOCATE HARDWARE TO TEAM */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl p-6 sm:p-7 bg-white shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 text-[#ea580c]">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1c140e]">Allocate Hardware</h3>
                  <p className="text-xs text-stone-500 font-mono">Assign physical stock to a participant team</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            {allocateError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                {allocateError}
              </div>
            )}

            <form onSubmit={handleAllocateSubmit} className="space-y-4 font-mono text-xs">
              {/* Select Team */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-600 font-bold">Target Team</label>
                  {(() => {
                    const sel = teams.find(t => t.id === selectedTeamId);
                    const lName = getTeamLeaderName(sel);
                    return lName ? (
                      <span className="text-[10px] font-mono font-bold text-[#ea580c] bg-orange-100/80 px-2 py-0.5 rounded-md border border-orange-200 flex items-center gap-1 shadow-2xs">
                        👑 Leader: <span className="underline">{lName}</span>
                      </span>
                    ) : null;
                  })()}
                </div>
                <select
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="">-- Choose Team --</option>
                  {teams.map(t => {
                    const isDisq = Boolean(t.isDisqualified || t.debarred || t.qualificationStatus === 'DEBARRED' || (t as any).status === 'DISQUALIFIED');
                    const lName = getTeamLeaderName(t);
                    return (
                      <option key={t.id} value={t.id} disabled={isDisq}>
                        {(t as any).teamName || (t as any).name || t.id} {lName ? `[👑 Leader: ${lName}]` : ''} ({t.id}){isDisq ? ' ❌ [DISQUALIFIED]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Team's Current Inventory Summary */}
              {selectedTeamId && teamCurrentAllocations.length > 0 && (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Currently Held by Team:</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {teamCurrentAllocations.map((x, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[10px] text-stone-700 font-bold">
                        {x.itemName} × {x.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Select Inventory Item */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Select Physical Component</label>
                <select
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="">-- Choose Part --</option>
                  {data?.items.map(item => {
                    const notDist = item.isDistributed === false;
                    return (
                      <option key={item.id} value={item.id} disabled={notDist || item.availableQuantity <= 0}>
                        {item.name} ({item.category}) — {item.availableQuantity} available{notDist ? ' 🔒 [NOT FOR DISTRIBUTION]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Available Stock Indicator */}
              {currentAllocateItem && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <span className="font-bold">Currently in stock:</span>
                  <span className="text-base font-black">{currentAllocateItem.availableQuantity} units</span>
                </div>
              )}

              {/* Quantity input */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Quantity to Allocate</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={currentAllocateItem?.availableQuantity || 999}
                    value={allocateQty}
                    onChange={e => setAllocateQty(parseInt(e.target.value, 10) || 1)}
                    className="w-32 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                  <span className="text-stone-400 text-xs">
                    (Max: {currentAllocateItem?.availableQuantity || 0})
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Distribution Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Round 1 Drive kit, Marshal Station B"
                  value={allocateNotes}
                  onChange={e => setAllocateNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocating || !selectedTeamId || !selectedItemId || (currentAllocateItem?.availableQuantity || 0) <= 0}
                  className="px-5 py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#d4621a] text-white font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {allocating ? 'Saving Allocation...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INVENTORY CORRECTION / ADJUSTMENT */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl p-6 sm:p-7 bg-white shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-stone-100 text-[#1c140e]">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1c140e]">Correct Team Allocation</h3>
                  <p className="text-xs text-stone-500 font-mono">Traceable stock adjustments & return reconciliation</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X size={18} />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-600 font-bold">Team</label>
                  {(() => {
                    const sel = teams.find(t => t.id === adjustTeamId);
                    const lName = getTeamLeaderName(sel);
                    return lName ? (
                      <span className="text-[10px] font-mono font-bold text-[#ea580c] bg-orange-100/80 px-2 py-0.5 rounded-md border border-orange-200 flex items-center gap-1 shadow-2xs">
                        👑 Leader: <span className="underline">{lName}</span>
                      </span>
                    ) : null;
                  })()}
                </div>
                <select
                  value={adjustTeamId}
                  onChange={e => setAdjustTeamId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="">-- Choose Team --</option>
                  {teams.map(t => {
                    const lName = getTeamLeaderName(t);
                    return (
                      <option key={t.id} value={t.id}>
                        {(t as any).teamName || (t as any).name || t.id} {lName ? `[👑 Leader: ${lName}]` : ''} ({t.id})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Component to Adjust</label>
                <select
                  value={adjustItemId}
                  onChange={e => setAdjustItemId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                >
                  <option value="">-- Choose Part --</option>
                  {data?.items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Adjustment Delta</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={e => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                    className="w-32 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                  <span className="text-stone-500 text-[11px]">
                    Use <strong>negative (-1)</strong> to remove/return units, or <strong>positive (+1)</strong> to add units.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Mandatory Reason / Justification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical count correction, Defective motor returned to pit"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting || !adjustTeamId || !adjustItemId || !adjustReason.trim() || adjustDelta === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#1c140e] hover:bg-black text-white font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {adjusting ? 'Submitting...' : 'Apply Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
