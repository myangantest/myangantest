import React, { useState, useEffect } from 'react';
import { dbService, isMockModeActive } from '../../lib/db';
import { UserProfile } from '../../types';
import {
  Database,
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  RotateCw,
  Trash2,
  ShieldCheck,
  Server,
  Layers,
  ListFilter,
  FileSpreadsheet,
  Info,
  Check
} from 'lucide-react';

interface MigrationViewProps {
  currentUser: UserProfile | null;
}

export interface LegacyDataPayload {
  users: any[];
  properties: any[];
  brokers: any[];
  leads: any[];
  favorites: any[];
  waitlist: any[];
  subscriptions: any[];
}

export interface MigrationSummary {
  total: number;
  migrated: number;
  skipped: number;
  duplicate: number;
  failed: number;
}

export interface EntityCounts {
  total: number;
  migrated: number;
  skipped: number;
  duplicate: number;
  failed: number;
}

export interface MigrationResponse {
  success: boolean;
  dryRun: boolean;
  batchId: string;
  timestamp: string;
  summary: MigrationSummary;
  details: {
    users: EntityCounts;
    brokers: EntityCounts;
    properties: EntityCounts;
    leads: EntityCounts;
    favorites: EntityCounts;
    waitlist: EntityCounts;
  };
  logs: any[];
  idMappingsCount: number;
}

export default function MigrationView({ currentUser }: MigrationViewProps) {
  const [detectedData, setDetectedData] = useState<LegacyDataPayload>({
    users: [],
    properties: [],
    brokers: [],
    leads: [],
    favorites: [],
    waitlist: [],
    subscriptions: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResponse | null>(null);
  const [dryRunCompleted, setDryRunCompleted] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [localCleared, setLocalCleared] = useState(false);

  const isSupabaseConnected = dbService.isSupabaseConnected();

  // Inspect localStorage on mount
  const scanLocalStorage = () => {
    try {
      const getArray = (key: string) => {
        try {
          const item = localStorage.getItem(key);
          if (!item) return [];
          const parsed = JSON.parse(item);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      const users = getArray('myangan_users');
      const properties = getArray('myangan_properties');
      const brokers = getArray('myangan_brokers');
      const leads = getArray('myangan_leads');
      const favorites = getArray('myangan_favorites');
      const waitlist = getArray('myangan_waitlist');
      const subscriptions = getArray('myangan_subscriptions');

      setDetectedData({
        users,
        properties,
        brokers,
        leads,
        favorites,
        waitlist,
        subscriptions,
      });
    } catch (err: any) {
      console.error('[Migration UI] Failed to scan browser localStorage:', err);
      setError('Unable to read local browser storage.');
    }
  };

  useEffect(() => {
    scanLocalStorage();
  }, []);

  const totalLegacyRecords =
    detectedData.users.length +
    detectedData.properties.length +
    detectedData.brokers.length +
    detectedData.leads.length +
    detectedData.favorites.length +
    detectedData.waitlist.length +
    detectedData.subscriptions.length;

  // 1. Download Backup JSON
  const handleDownloadBackup = () => {
    // Sanitize data: remove plain passwords and secrets before exporting
    const sanitizedUsers = detectedData.users.map(u => {
      const { password, token, otp, secret, ...safe } = u;
      return safe;
    });

    const backupPayload = {
      app: 'MyAngan Real Estate Portal',
      schema_version: '1.0.0',
      exported_at: new Date().toISOString(),
      record_counts: {
        users: sanitizedUsers.length,
        properties: detectedData.properties.length,
        brokers: detectedData.brokers.length,
        leads: detectedData.leads.length,
        favorites: detectedData.favorites.length,
        waitlist: detectedData.waitlist.length,
        subscriptions: detectedData.subscriptions.length,
        total: totalLegacyRecords,
      },
      data: {
        ...detectedData,
        users: sanitizedUsers,
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `myangan_legacy_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 2. Execute Dry Run or Live Migration
  const runMigrationApi = async (dryRun: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/migrate-legacy-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': currentUser?.role || 'admin',
          'x-admin-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          dryRun,
          adminRole: currentUser?.role,
          adminUserId: currentUser?.id,
          legacyData: detectedData,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || resData.message || 'Migration request failed.');
      }

      setMigrationResult(resData);
      if (dryRun) {
        setDryRunCompleted(true);
      }
    } catch (err: any) {
      console.error('[Migration Error]', err);
      setError(err.message || 'Failed to execute migration API request.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Download Audit Log Report
  const handleDownloadReport = () => {
    if (!migrationResult) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(migrationResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `migration_audit_report_${migrationResult.batchId}_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 4. Confirm & Clear Local Storage
  const handleClearLocalStorage = () => {
    try {
      localStorage.removeItem('myangan_users');
      localStorage.removeItem('myangan_properties');
      localStorage.removeItem('myangan_brokers');
      localStorage.removeItem('myangan_leads');
      localStorage.removeItem('myangan_favorites');
      localStorage.removeItem('myangan_waitlist');
      localStorage.removeItem('myangan_subscriptions');
      scanLocalStorage();
      setLocalCleared(true);
      setShowClearConfirmModal(false);
    } catch (err) {
      console.error('Failed to clear local storage:', err);
      alert('Failed to clear localStorage items.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-display font-bold">Legacy Local Storage Data Migration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Controlled, idempotent migration engine to transition un-synced browser <code className="text-amber-400 font-mono">localStorage</code> records into Supabase PostgreSQL tables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSupabaseConnected ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Supabase Connected</span>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Supabase Unconfigured</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Control Panel & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Detected Local Records</span>
          <span className="text-3xl font-display font-black text-slate-900 block">{totalLegacyRecords}</span>
          <span className="text-[11px] text-slate-500 block">Across 7 browser storage keys</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Dry Run Status</span>
          <span className={`text-xl font-display font-bold block ${dryRunCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
            {dryRunCompleted ? 'Verified & Ready' : 'Pending Verification'}
          </span>
          <span className="text-[11px] text-slate-500 block">Validation before database writes</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Migration Batch</span>
          <span className="text-xl font-display font-bold text-slate-900 block truncate">
            {migrationResult ? migrationResult.batchId : 'Not Started'}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {migrationResult ? (migrationResult.dryRun ? 'Dry Run Output' : 'Live Batch Logged') : 'Audit log uninitialized'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Local Data Cleanup</span>
          <span className={`text-xl font-display font-bold block ${localCleared ? 'text-emerald-600' : 'text-slate-700'}`}>
            {localCleared ? 'Cleared' : 'Retained in Browser'}
          </span>
          <span className="text-[11px] text-slate-500 block">Preserved until explicit confirmation</span>
        </div>
      </div>

      {/* Main Migration Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Local Storage Inspection */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              <span>Local Storage Inventory</span>
            </h3>
            <button
              onClick={scanLocalStorage}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Rescan LocalStorage"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { label: 'User Profiles', key: 'myangan_users', count: detectedData.users.length, desc: 'Renter, Owner & Broker accounts' },
              { label: 'Properties', key: 'myangan_properties', count: detectedData.properties.length, desc: 'Real estate listings & details' },
              { label: 'Brokers', key: 'myangan_brokers', count: detectedData.brokers.length, desc: 'Agency registrations & contacts' },
              { label: 'Leads & Inquiries', key: 'myangan_leads', count: detectedData.leads.length, desc: 'Inquiry forms & tenant leads' },
              { label: 'Favorites', key: 'myangan_favorites', count: detectedData.favorites.length, desc: 'Bookmarked property IDs' },
              { label: 'Waitlist Entries', key: 'myangan_waitlist', count: detectedData.waitlist.length, desc: 'B2B launch registrations' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">{item.label}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">{item.key}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${item.count > 0 ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-500'}`}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>

          {/* Backup Button */}
          <div className="pt-2">
            <button
              onClick={handleDownloadBackup}
              disabled={totalLegacyRecords === 0}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup ({totalLegacyRecords} items)</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Exports clean backup without plain passwords, tokens, or OTP secrets.
            </p>
          </div>
        </div>

        {/* Right Column: Migration Operations & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operations Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Migration Execution Engine</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Idempotent deduplication, Zod record validation &amp; UUID relationship mapping.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => runMigrationApi(true)}
                  disabled={loading || totalLegacyRecords === 0}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ListFilter className="w-3.5 h-3.5 text-amber-400" />
                  <span>{loading ? 'Validating...' : 'Run Dry Run'}</span>
                </button>

                <button
                  onClick={() => runMigrationApi(false)}
                  disabled={loading || totalLegacyRecords === 0}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loading ? 'Processing...' : 'Start Live Migration'}</span>
                </button>
              </div>
            </div>

            {/* Migration Results Overview */}
            {migrationResult ? (
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${migrationResult.dryRun ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <h4 className="font-display font-bold text-slate-900 text-sm">
                        {migrationResult.dryRun ? 'Dry Run Results (Preview)' : 'Live Migration Results'}
                      </h4>
                    </div>

                    <button
                      onClick={handleDownloadReport}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5 text-orange-500" />
                      <span>Download Audit Log</span>
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">Total</span>
                      <span className="text-xl font-bold text-slate-900">{migrationResult.summary.total}</span>
                    </div>

                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-mono text-emerald-600 block">Migrated</span>
                      <span className="text-xl font-bold text-emerald-700">{migrationResult.summary.migrated}</span>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <span className="text-[10px] uppercase font-mono text-blue-600 block">Duplicate</span>
                      <span className="text-xl font-bold text-blue-700">{migrationResult.summary.duplicate}</span>
                    </div>

                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block">Skipped</span>
                      <span className="text-xl font-bold text-slate-700">{migrationResult.summary.skipped}</span>
                    </div>

                    <div className="bg-red-50 p-3 rounded-xl border border-red-200">
                      <span className="text-[10px] uppercase font-mono text-red-600 block">Failed</span>
                      <span className="text-xl font-bold text-red-700">{migrationResult.summary.failed}</span>
                    </div>
                  </div>

                  {/* Detail Breakdown Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Entity</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Total</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Migrated</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Duplicate</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Failed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Object.entries(migrationResult.details) as [string, EntityCounts][]).map(([entityKey, stats]) => (
                          <tr key={entityKey} className="hover:bg-slate-50/50">
                            <td className="py-2 px-4 font-medium text-slate-800 capitalize">{entityKey}</td>
                            <td className="py-2 px-4 text-center font-mono">{stats.total}</td>
                            <td className="py-2 px-4 text-center font-mono font-bold text-emerald-600">{stats.migrated}</td>
                            <td className="py-2 px-4 text-center font-mono text-blue-600">{stats.duplicate}</td>
                            <td className="py-2 px-4 text-center font-mono font-bold text-red-600">{stats.failed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Log Samples */}
                  {migrationResult.logs && migrationResult.logs.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">Recent Audit Logs (Sample)</span>
                      <div className="max-h-48 overflow-y-auto font-mono text-[11px] bg-slate-900 text-slate-200 p-3 rounded-xl space-y-1">
                        {migrationResult.logs.slice(0, 10).map((log: any) => (
                          <div key={log.id} className="flex items-start gap-2">
                            <span className={`shrink-0 px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                              log.status === 'migrated' ? 'bg-emerald-800 text-emerald-200' :
                              log.status === 'duplicate' ? 'bg-blue-800 text-blue-200' : 'bg-red-800 text-red-200'
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-orange-400">[{log.entity_type}]</span>
                            <span className="text-slate-300 truncate">{log.action}: {log.source_fingerprint}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cleanup Trigger */}
                {!migrationResult.dryRun && migrationResult.summary.migrated > 0 && !localCleared && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <Info className="w-5 h-5 text-orange-600 shrink-0" />
                      <p className="text-xs text-orange-900">
                        Migration completed! You can now safely clear the legacy localStorage data from this browser.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowClearConfirmModal(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Legacy Storage</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <Server className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-700">Ready for Migration Execution</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click <strong>Run Dry Run</strong> to simulate validation and duplicate checks without mutating database records.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-display font-bold text-slate-900">Confirm Local Storage Cleanup</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently delete the <strong>MyAngan legacy localStorage items</strong> from this browser session. Ensure you have downloaded a JSON backup if needed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLocalStorage}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Yes, Clear Local Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
