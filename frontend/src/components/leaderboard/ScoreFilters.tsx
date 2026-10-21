import React from 'react';
import { Search, Filter } from 'lucide-react';
import { LeaderboardFilters } from '../../types/leaderboard';

interface ScoreFiltersProps {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
}

export const ScoreFilters: React.FC<ScoreFiltersProps> = ({ filters, onChange }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={filters.searchQuery || ''}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Filter checkboxes and toggles */}
      <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
          <input
            type="checkbox"
            checked={!!filters.onlyQualified}
            onChange={(e) => onChange({ ...filters, onlyQualified: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400"
          />
          <span>Only Top 50 Qualified</span>
        </label>
      </div>
    </div>
  );
};
