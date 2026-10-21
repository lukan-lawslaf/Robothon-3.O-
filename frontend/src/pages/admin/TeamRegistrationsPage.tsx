import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Users,
  Crown,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Download,
  AlertCircle,
  Mail,
  Hash,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  Trash2,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import {
  RegistrationTeam,
  parseRegistrationCsv,
  fetchRegistrationRoster,
  saveRegistrationRoster,
  clearAllRegistrations,
  deleteTeamFromRoster,
} from '../../services/registrationService';
import { useAccount } from '../../services/authService';

export const TeamRegistrationsPage: React.FC = () => {
  const account = useAccount();
  const [teams, setTeams] = useState<RegistrationTeam[]>([]);
  const [sourceName, setSourceName] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Load existing roster on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetchRegistrationRoster();
        if (res.roster && res.roster.length > 0) {
          setTeams(res.roster);
          setSourceName(res.source || 'Saved Roster');
          setLastUpdated(res.updatedAt ? new Date(res.updatedAt).toLocaleTimeString() : '');
        } else {
          setTeams([]);
          setSourceName('');
          setLastUpdated('');
        }
      } catch (err: any) {
        console.warn('Initial roster fetch notice:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle file upload with clean replacement
  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      const text = await file.text();
      const extracted = parseRegistrationCsv(text);
      if (!extracted.length) {
        showNotification('No valid team records found in CSV file.', 'error');
        return;
      }
      // Clean replacement: clear old state, set new
      setTeams(extracted);
      setSourceName(file.name);
      setLastUpdated(new Date().toLocaleTimeString());

      // Save and sync with backend database
      await saveRegistrationRoster(extracted, file.name, true);
      showNotification(`✨ Clean Import Applied: Removed all old teams. Registered ${extracted.length} new teams in database!`, 'success');
    } catch (err: any) {
      showNotification(`Upload failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to completely remove ALL registered teams from the database? This cannot be undone.')) {
      return;
    }
    try {
      setIsProcessing(true);
      await clearAllRegistrations();
      setTeams([]);
      setSourceName('');
      setLastUpdated('');
      showNotification('All registered teams and member records have been wiped clean from the database.', 'info');
    } catch (err: any) {
      showNotification(`Failed to clear rosters: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingleTeam = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${teamName}" from the database and active team roster?`)) {
      return;
    }
    try {
      setIsProcessing(true);
      await deleteTeamFromRoster(teamId);
      setTeams(prev => prev.filter(t => t.teamId !== teamId));
      showNotification(`Team "${teamName}" has been removed from the database.`, 'success');
    } catch (err: any) {
      showNotification(`Failed to remove team: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncToPlatform = async () => {
    if (!teams.length) return;
    try {
      setIsProcessing(true);
      await saveRegistrationRoster(teams, sourceName, true);
      showNotification(`Successfully synced ${teams.length} teams to competition platform & live leaderboard!`, 'success');
    } catch (err: any) {
      showNotification(`Sync failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(teams, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `robothon-teams-roster-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Exported parsed team roster JSON.', 'info');
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Metrics
  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalLeaders = teams.filter(t => t.leader !== null).length;
    const totalParticipants = teams.reduce((acc, t) => acc + (t.totalMembers || 0), 0);
    const avgSize = totalTeams > 0 ? (totalParticipants / totalTeams).toFixed(1) : '0';
    return { totalTeams, totalLeaders, totalParticipants, avgSize };
  }, [teams]);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      if (sizeFilter !== 'all' && t.totalMembers !== Number(sizeFilter)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTeam = t.teamName.toLowerCase().includes(q);
      const inLeaderName = t.leader?.name.toLowerCase().includes(q) || false;
      const inLeaderEnrollment = t.leader?.enrollment.toLowerCase().includes(q) || false;
      const inLeaderEmail = t.leader?.email.toLowerCase().includes(q) || false;
      const inMembers = t.members.some(
        m => m.name.toLowerCase().includes(q) || m.enrollment.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
      return inTeam || inLeaderName || inLeaderEnrollment || inLeaderEmail || inMembers;
    });
  }, [teams, searchQuery, sizeFilter]);

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-[#221A15] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header - Light Mode */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE0D5] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#23150A] flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#D4621A]" />
            <span>Team Registrations</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5C51] font-mono mt-1">
            Upload CSV rosters and manage team leader accounts.
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-50 border border-amber-200 text-amber-900 font-medium">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              Leader Password = Enrollment Number
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin-dashboard"
            className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-mono text-xs transition-colors shadow-xs"
          >
            &larr; Admin Hub
          </Link>
          <button
            onClick={handleClearAll}
            disabled={isProcessing || teams.length === 0}
            className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            title="Wipe all registered teams from database"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Clear Roster</span>
          </button>
          <button
            onClick={handleSyncToPlatform}
            disabled={isProcessing || teams.length === 0}
            className="px-4 py-2 rounded-xl bg-[#D4621A] hover:bg-[#b85214] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Sync to Platform</span>
          </button>
          <button
            onClick={handleExportJson}
            disabled={teams.length === 0}
            className="px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="max-w-7xl mx-auto">
          <div
            className={`p-3.5 rounded-2xl border text-xs font-mono flex items-center gap-2.5 shadow-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : message.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Metric Cards - Light Mode */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE0D5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono mb-1">
            <span>Total Teams</span>
            <Users className="w-4 h-4 text-[#D4621A]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#23150A]">{stats.totalTeams}</p>
          <span className="text-[11px] text-stone-400 font-mono">Registered database units</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE0D5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono mb-1">
            <span>Team Leaders</span>
            <Crown className="w-4 h-4 text-[#D4621A]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-[#D4621A]">{stats.totalLeaders}</p>
          <span className="text-[11px] text-stone-400 font-mono">Designated primary leads</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE0D5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono mb-1">
            <span>Total Participants</span>
            <UserCheck className="w-4 h-4 text-stone-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-stone-800">{stats.totalParticipants}</p>
          <span className="text-[11px] text-stone-400 font-mono">Leaders + Members</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE0D5] shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono mb-1">
            <span>Avg Team Size</span>
            <Hash className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-stone-700">{stats.avgSize}</p>
          <span className="text-[11px] text-stone-400 font-mono">Members per squad</span>
        </div>
      </div>

      {/* Upload Zone & Quick Ingestion Panel - Light Mode */}
      <div className="max-w-7xl mx-auto">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="p-6 rounded-3xl border-2 border-dashed border-[#D4621A]/50 bg-gradient-to-r from-[#FFFBF8] via-white to-[#FFFBF8] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#D4621A] shrink-0 shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#23150A] flex items-center gap-2">
                <span>Upload Registration CSV</span>
              </h3>
              <p className="text-xs text-[#6B5C51] font-mono max-w-xl leading-relaxed">
                Drag & drop or browse your Google Forms CSV file to register teams and leaders.
              </p>
              {sourceName && (
                <p className="text-[11px] text-[#C2520F] font-mono pt-1">
                  Active Roster Source: <strong className="text-stone-900">{sourceName}</strong> {lastUpdated && `• ${lastUpdated}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <label className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-orange-50/50 border border-stone-200 text-stone-800 font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-[#D4621A]" />
              <span>Browse CSV File</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>


          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar - Light Mode */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-[#EAE0D5] p-3 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by team, leader, member, email, or enrollment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F7F4F0] border border-stone-200 text-xs font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#D4621A] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#F7F4F0] border border-stone-200 px-2 py-1 rounded-xl text-xs font-mono text-stone-600">
            <Filter className="w-3.5 h-3.5 text-[#D4621A]" />
            <span>Size:</span>
            {['all', '3', '4', '5'].map((size) => (
              <button
                key={size}
                onClick={() => setSizeFilter(size)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-colors ${
                  sizeFilter === size
                    ? 'bg-[#D4621A] text-white font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {size === 'all' ? 'All' : `${size}P`}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[#F7F4F0] border border-stone-200 p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Detailed Table View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Light Mode */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="p-12 text-center text-stone-500 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#D4621A] mb-2" />
            <span>Loading registered rosters from database...</span>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="p-12 rounded-3xl border border-[#EAE0D5] bg-white text-center space-y-3 shadow-xs">
            <Users className="w-10 h-10 text-stone-400 mx-auto" />
            <p className="text-sm font-mono text-stone-600">
              {teams.length === 0
                ? 'No team registration list uploaded yet. Upload your Google Forms registration CSV file above.'
                : 'No teams match the active search or filter criteria.'}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Cards Grid View - Light Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTeams.map((team) => {
              const isExpanded = expandedTeams[team.teamId] ?? true;
              return (
                <div
                  key={team.teamId}
                  className="rounded-3xl border border-[#EAE0D5] bg-white p-5 space-y-4 shadow-xs hover:border-[#D4621A]/50 hover:shadow-md transition-all"
                >
                  {/* Team Card Header */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#D4621A] font-bold font-mono text-sm shadow-xs">
                        {team.teamName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#23150A] tracking-tight">
                          {team.teamName}
                        </h3>
                        <span className="text-[10px] font-mono text-stone-400">
                          Form Entry Row {team.sourceRow}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-orange-50 text-[#C2520F] border border-orange-200">
                        {team.totalMembers} Members
                      </span>
                      {/* Individual Team Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleTeam(team.teamId, team.teamName)}
                        className="px-2.5 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-mono border border-red-200/70 transition-colors flex items-center gap-1 cursor-pointer"
                        title={`Remove ${team.teamName} from database`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                      <button
                        onClick={() => toggleExpand(team.teamId)}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Designated Team Leader Block - Light Mode */}
                  {team.leader ? (
                    <div className="p-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          <Crown className="w-3 h-3 text-amber-600" />
                          TEAM LEADER (1st Registered)
                        </span>
                        {team.leader.residence && (
                          <span className="text-[10px] font-mono text-stone-500 bg-white px-2 py-0.5 rounded-full border border-stone-200">
                            {team.leader.residence}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                        <p className="text-base font-bold text-[#201206] tracking-tight">
                          {team.leader.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-bold shadow-xs">
                            Enrollment: {team.leader.enrollment}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Login Credentials Box */}
                      <div className="p-2.5 rounded-xl bg-white border border-amber-200/90 text-xs font-mono space-y-1 shadow-xs">
                        <div className="flex items-center justify-between text-stone-600">
                          <span className="flex items-center gap-1 text-stone-700">
                            <Mail className="w-3.5 h-3.5 text-[#D4621A]" />
                            <strong>Login Email:</strong> {team.leader.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(team.leader?.email || '', `email-${team.teamId}`)}
                            className="text-stone-400 hover:text-stone-700 p-0.5"
                            title="Copy email"
                          >
                            {copiedKey === `email-${team.teamId}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[#854D0E] bg-amber-50/60 px-2 py-1 rounded-lg border border-amber-200/60">
                          <span className="flex items-center gap-1 font-semibold">
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            <span>Login Password:</span>
                            <span className="px-1.5 py-0.2 rounded bg-white border border-amber-300 font-bold text-amber-950">
                              {team.leader.enrollment}
                            </span>
                            <span className="text-[10px] text-stone-500 font-normal">(Enrollment Number)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(team.leader?.enrollment || '', `pass-${team.teamId}`)}
                            className="text-amber-700 hover:text-amber-900 p-0.5"
                            title="Copy password"
                          >
                            {copiedKey === `pass-${team.teamId}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {team.leader.phone && (
                          <div className="text-[11px] text-stone-500 pt-0.5">
                            WhatsApp / Phone: {team.leader.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs font-mono text-red-700">
                      No designated leader found for this team.
                    </div>
                  )}

                  {/* Additional Team Members - Light Mode */}
                  {isExpanded && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono text-stone-500 px-1">
                        <span>Team Members ({team.members.length})</span>
                      </div>

                      <div className="space-y-1.5">
                        {team.members.map((member) => (
                          <div
                            key={member.memberIndex}
                            className="p-2.5 rounded-xl border border-stone-200/80 bg-[#FAF7F3] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-stone-200/80 text-stone-700 text-[10px] font-mono flex items-center justify-center font-bold">
                                #{member.memberIndex}
                              </span>
                              <span className="font-semibold text-stone-900">
                                {member.name}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-white text-stone-700 border border-stone-200">
                                {member.enrollment}
                              </span>
                              <span className="text-stone-500 truncate max-w-[200px]" title={member.email}>
                                {member.email}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View - Light Mode matching user reference */
          <div className="rounded-3xl border border-[#EAE0D5] bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#F5EFE9] text-[#78695E] uppercase text-[10px] tracking-wider border-b border-[#EAE0D5]">
                  <tr>
                    <th className="py-3.5 px-4">Row</th>
                    <th className="py-3.5 px-4">Team Name</th>
                    <th className="py-3.5 px-4">Leader Name</th>
                    <th className="py-3.5 px-4">Enrollment (Password)</th>
                    <th className="py-3.5 px-4">College Email (Login)</th>
                    <th className="py-3.5 px-4">Team Members</th>
                    <th className="py-3.5 px-4 text-center">Total</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1E8DF]">
                  {filteredTeams.map((team) => (
                    <tr key={team.teamId} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-3.5 px-4 text-stone-400 font-bold">{team.sourceRow}</td>
                      <td className="py-3.5 px-4 font-bold text-stone-900">{team.teamName}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                          <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{team.leader?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-950 font-bold">
                          🔑 {team.leader?.enrollment || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700">{team.leader?.email || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {team.members.map((m) => (
                            <div key={m.memberIndex} className="text-[11px] text-stone-600 flex items-center gap-1.5">
                              <span className="text-stone-400 font-bold">#{m.memberIndex}</span>
                              <span className="text-stone-900 font-medium">{m.name}</span>
                              <span className="text-stone-500 font-mono">({m.enrollment})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#C2520F] border border-orange-200">
                          {team.totalMembers}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleTeam(team.teamId, team.teamName)}
                          className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-[11px] font-mono border border-red-200 transition-colors cursor-pointer"
                          title="Remove from database"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
