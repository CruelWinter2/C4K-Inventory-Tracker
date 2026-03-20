import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Eye, Trash2, Download, RefreshCw, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/api';

const STATUSES = ['Processing', 'In Stock', 'Donated', 'Sold', 'Pending Review', 'Pending Delivery'];
const RECORDS_PER_PAGE = 25;

const STATUS_STYLES = {
  'Processing':       { bg: '#e0e7ff', text: '#2e5496', border: '#2e5496' },
  'In Stock':         { bg: '#dcfce7', text: '#15803d', border: '#15803d' },
  'Donated':          { bg: '#f3e8ff', text: '#7e22ce', border: '#7e22ce' },
  'Sold':             { bg: '#fef3c7', text: '#b45309', border: '#b45309' },
  'Pending Review':   { bg: '#fee2e2', text: '#b91c1c', border: '#b91c1c' },
  'Pending Delivery': { bg: '#e0f2fe', text: '#0369a1', border: '#0369a1' },
};

const FILTER_OPTIONS = [
  { value: 'All',      label: 'All Computers' },
  { value: 'In Stock', label: 'In Stock Only' },
  { value: 'Pending',  label: 'Pending Only' },
  { value: 'Sold',     label: 'Sold Only' },
];

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Processing'];
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border"
    >
      {status}
    </span>
  );
}

function ConfirmDeleteDialog({ computer, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 z-10"
      >
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-5 h-5 text-red-600" aria-hidden="true" />
        </div>
        <h2 id="delete-dialog-title" className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Delete Computer?
        </h2>
        <p id="delete-dialog-desc" className="text-gray-500 text-sm mb-6">
          Are you sure you want to delete record <strong className="text-gray-900">{computer?.serial_no}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
            data-testid="delete-cancel-button"
            autoFocus
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            data-testid="delete-confirm-button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/** Parses "MM/DD/YYYY" date string to a Date object, or null if invalid. */
function parseDateStr(str) {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Returns array of page numbers with 'ellipsis-N' strings for gaps. */
function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const pages = new Set([1, total]);
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(`ellipsis-${i}`);
    result.push(sorted[i]);
  }
  return result;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();

  const fetchComputers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/computers`);
      setComputers(res.data);
    } catch {
      toast.error('Failed to load inventory. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComputers(); }, [fetchComputers]);

  // Reset to page 1 whenever search, filter, or dates change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, startDate, endDate]);

  // Apply search + status filter + date range
  const filtered = computers.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.serial_no?.toLowerCase().includes(q) ||
      c.recipient_name?.toLowerCase().includes(q) ||
      c.manufacturer?.toLowerCase().includes(q) ||
      c.modal?.toLowerCase().includes(q);
    const matchesFilter = statusFilter === 'All' ||
      (statusFilter === 'Pending'
        ? (c.inventory_status === 'Pending Review' || c.inventory_status === 'Pending Delivery')
        : c.inventory_status === statusFilter);
    const recordDate = parseDateStr(c.date_imaged);
    const start = parseDateStr(startDate);
    const end = parseDateStr(endDate);
    const matchesStart = !start || (recordDate !== null && recordDate >= start);
    const matchesEnd = !end || (recordDate !== null && recordDate <= end);
    return matchesSearch && matchesFilter && matchesStart && matchesEnd;
  });

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * RECORDS_PER_PAGE;
  const pageRecords = filtered.slice(pageStart, pageStart + RECORDS_PER_PAGE);

  const handleStatusChange = async (serialNo, newStatus) => {
    try {
      await axios.patch(`${API_BASE}/computers/${encodeURIComponent(serialNo)}/status`, { status: newStatus });
      setComputers(prev => prev.map(c => c.serial_no === serialNo ? { ...c, inventory_status: newStatus } : c));
      toast.success(`Status updated to "${newStatus}"`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE}/computers/${encodeURIComponent(deleteTarget.serial_no)}`);
      setComputers(prev => prev.filter(c => c.serial_no !== deleteTarget.serial_no));
      toast.success(`Record "${deleteTarget.serial_no}" deleted`);
    } catch {
      toast.error('Failed to delete record');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = useCallback(() => {
    if (filtered.length === 0) {
      toast.error('No records to export. Adjust your filters to include some records.');
      return;
    }

    const fields = [
      'serial_no', 'inventory_status', 'recipient_name', 'parent_name',
      'school', 'school_id', 'address', 'city', 'state', 'zip_code', 'phone',
      'os_win10', 'os_win11', 'os_home', 'os_pro', 'os_activated',
      'opendns_preferred', 'opendns_alternate',
      'program_firefox', 'program_chrome', 'program_avira', 'program_libre_office',
      'program_cd_burner_xp', 'program_java', 'program_vlc_player',
      'desktop_computer', 'laptop_computer', 'manufacturer', 'modal',
      'cpu_name', 'cpu_cores', 'cpu_speed', 'ram', 'storage_size',
      'storage_hdd', 'storage_ssd', 'bios_version', 'special_features',
      'touch_screen_yes', 'touch_screen_no',
      'imaged_by', 'date_imaged', 'reviewed_by', 'date_reviewed',
      'delivered_by', 'date_delivered',
      'oig_1_1', 'oig_2_1', 'oig_2_2', 'oig_2_3', 'oig_2_4',
      'oig_3_1', 'oig_3_2', 'oig_3_3', 'oig_3_4', 'oig_3_5', 'oig_3_6', 'oig_3_7',
      'created_at', 'updated_at', 'created_by',
    ];

    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    // Map internal field names to friendly CSV column headers
    const HEADER_LABELS = { 'modal': 'model' };
    const csv = [
      fields.map(f => HEADER_LABELS[f] || f).join(','),
      ...filtered.map(rec => fields.map(f => esc(rec[f])).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'c4k_inventory.csv';
    a.click();
    URL.revokeObjectURL(url);

    const isFiltered = search || statusFilter !== 'All' || startDate || endDate;
    toast.success(`Exported ${filtered.length} ${isFiltered ? 'filtered ' : ''}record${filtered.length !== 1 ? 's' : ''}`);
  }, [filtered, search, statusFilter, startDate, endDate]);

  const stats = {
    total: filtered.length,
    inStock: filtered.filter(c => c.inventory_status === 'In Stock').length,
    pending: filtered.filter(c => c.inventory_status === 'Pending Review' || c.inventory_status === 'Pending Delivery').length,
    donatedSold: filtered.filter(c => c.inventory_status === 'Donated' || c.inventory_status === 'Sold').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <Sidebar onExport={handleExport} />

      <main className="md:ml-64 flex-1 flex flex-col min-h-screen pt-14 md:pt-0" id="main-content">
        {/* Page header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage all donated computer records</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchComputers}
              aria-label="Refresh the inventory list"
              className="p-2 text-gray-500 hover:text-[#2e5496] hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
              data-testid="refresh-button"
            >
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
              data-testid="export-csv-button"
              aria-label={
                (search || statusFilter !== 'All' || startDate || endDate)
                  ? `Export ${filtered.length} filtered records to CSV`
                  : 'Export all inventory records to a CSV file'
              }
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {(search || statusFilter !== 'All' || startDate || endDate)
                ? `Export CSV (${filtered.length})`
                : 'Export CSV'}
            </button>

            {/* Print All Visible */}
            <button
              onClick={() => {
                if (filtered.length === 0) {
                  toast.error('No records to print. Adjust your filters first.');
                  return;
                }
                navigate('/print-all', { state: { records: filtered } });
              }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
              data-testid="print-all-button"
              aria-label={`Print all ${filtered.length} currently visible record${filtered.length !== 1 ? 's' : ''}`}
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              {`Print All (${filtered.length})`}
            </button>
            <button
              onClick={() => navigate('/add')}
              className="flex items-center gap-2 bg-[#2e5496] hover:bg-[#1e3a6e] text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
              data-testid="add-computer-button"
              aria-label="Add a new computer record"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Computer
            </button>
          </div>
        </header>

        <div className="flex-1 px-8 py-6">
          {/* Quick Stats Bar */}
          <section
            aria-label="Inventory quick stats"
            aria-live="polite"
            aria-atomic="true"
            data-testid="stats-bar"
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          >
            {[
              { label: 'Total Shown',    value: stats.total,      color: '#2e5496', testid: 'stat-total' },
              { label: 'In Stock',       value: stats.inStock,    color: '#15803d', testid: 'stat-in-stock' },
              { label: 'Pending',        value: stats.pending,    color: '#b45309', testid: 'stat-pending' },
              { label: 'Donated / Sold', value: stats.donatedSold,color: '#7e22ce', testid: 'stat-donated-sold' },
            ].map(({ label, value, color, testid }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color }} data-testid={testid}>{value}</p>
              </div>
            ))}
          </section>

          {/* Search + Filter row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                id="inventory-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Serial No., Recipient, Manufacturer, or Model..."
                aria-label="Search inventory by serial number or recipient name"
                className="w-full border-2 border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/20 bg-white"
                data-testid="search-input"
              />
            </div>

            {/* Filter toggles */}
            <div
              className="flex items-center gap-2 flex-shrink-0"
              role="group"
              aria-label="Filter inventory by status"
            >
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-1 hidden sm:block">Filter:</span>
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  aria-pressed={statusFilter === opt.value}
                  aria-label={`${opt.label}${statusFilter === opt.value ? ' (active filter)' : ''}`}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496] focus-visible:ring-offset-1
                    ${statusFilter === opt.value
                      ? 'bg-[#2e5496] text-white border-[#2e5496] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#2e5496] hover:text-[#2e5496]'
                    }`}
                  data-testid={`filter-${opt.value.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Screen reader live region — search & filter announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="sr-announcement">
            {search
              ? `Search complete, ${filtered.length} ${filtered.length === 1 ? 'result' : 'results'} found for "${search}".`
              : `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'} shown.`
            }
            {statusFilter !== 'All' ? ` Filtered by status: ${statusFilter}.` : ''}
            {(startDate || endDate) ? ` Date range: ${startDate || 'any'} to ${endDate || 'any'}.` : ''}
          </div>

          {/* Date Range filter row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5 items-start sm:items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap flex-shrink-0">
              Date Imaged:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="date-start" className="text-xs text-gray-600 font-medium whitespace-nowrap">From:</label>
              <input
                type="text"
                id="date-start"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                placeholder="MM/DD/YYYY"
                aria-label="Start date for Date Imaged filter, type in MM/DD/YYYY format"
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/20 bg-white w-32"
                data-testid="date-start-input"
              />
              <label htmlFor="date-end" className="text-xs text-gray-600 font-medium whitespace-nowrap">To:</label>
              <input
                type="text"
                id="date-end"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="MM/DD/YYYY"
                aria-label="End date for Date Imaged filter, type in MM/DD/YYYY format"
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2e5496] focus:ring-2 focus:ring-[#2e5496]/20 bg-white w-32"
                data-testid="date-end-input"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496] px-2 py-1 rounded"
                  aria-label="Clear date range filter"
                  data-testid="clear-date-filter"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Computer inventory table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Serial No.</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Manufacturer</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Model</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Date Imaged</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Recipient</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody aria-live="polite" aria-busy={loading}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
                        <div className="w-8 h-8 border-4 border-[#2e5496] border-t-transparent rounded-full animate-spin mx-auto" role="status" aria-label="Loading inventory" />
                      </td>
                    </tr>
                  ) : pageRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400">
                        {search || statusFilter !== 'All' || startDate || endDate ? (
                          <div>
                            <p className="font-semibold text-gray-500 mb-1">No matching records found.</p>
                            <button
                              onClick={() => { setSearch(''); setStatusFilter('All'); setStartDate(''); setEndDate(''); }}
                              className="text-[#2e5496] text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
                              aria-label="Clear all filters and search"
                            >
                              Clear filters
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <p className="font-semibold text-gray-500">No computers in inventory yet.</p>
                            <button
                              onClick={() => navigate('/add')}
                              className="text-[#2e5496] font-semibold text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
                              aria-label="Navigate to add a new computer"
                            >
                              Add the first one →
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    pageRecords.map(computer => (
                      <tr
                        key={computer.serial_no}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100"
                        data-testid={`row-${computer.serial_no}`}
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-[#2e5496] text-xs">
                          {computer.serial_no}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{computer.manufacturer || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{computer.modal || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{computer.date_imaged || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 text-xs max-w-[140px] truncate">{computer.recipient_name || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={computer.inventory_status || 'Processing'} />
                            <select
                              value={computer.inventory_status || 'Processing'}
                              onChange={e => handleStatusChange(computer.serial_no, e.target.value)}
                              aria-label={`Change status for serial number ${computer.serial_no}`}
                              className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-[#2e5496] focus:ring-1 focus:ring-[#2e5496]"
                              data-testid={`status-select-${computer.serial_no}`}
                            >
                              {STATUSES.map(s => (
                                <option key={s} value={s} disabled={!isAdmin && (s === 'Donated' || s === 'Sold')}>
                                  {s}{!isAdmin && (s === 'Donated' || s === 'Sold') ? ' (admin only)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => navigate(`/edit/${encodeURIComponent(computer.serial_no)}`)}
                              aria-label={`Edit record for serial number ${computer.serial_no}`}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              data-testid={`edit-btn-${computer.serial_no}`}
                            >
                              <Edit2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => navigate(`/print/${encodeURIComponent(computer.serial_no)}`)}
                              aria-label={`View and print record for serial number ${computer.serial_no}`}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                              data-testid={`view-btn-${computer.serial_no}`}
                            >
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteTarget(computer)}
                                aria-label={`Delete record for serial number ${computer.serial_no}`}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                data-testid={`delete-btn-${computer.serial_no}`}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-500" aria-live="polite" aria-atomic="true">
                  Showing <strong>{pageStart + 1}–{Math.min(pageStart + RECORDS_PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> records
                  {statusFilter !== 'All' && <span className="text-[#2e5496]"> (filtered)</span>}
                </p>

                <nav aria-label="Pagination navigation" className="flex items-center gap-1">
                  {/* Previous */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label="Go to previous page"
                    aria-disabled={safePage <= 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
                    data-testid="pagination-prev"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    Previous
                  </button>

                  {/* Page number buttons */}
                  {getPageRange(safePage, totalPages).map(page =>
                    typeof page === 'string' ? (
                      <span key={page} className="px-1 text-gray-400 text-xs select-none" aria-hidden="true">…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Jump to page ${page}`}
                        aria-current={page === safePage ? 'page' : undefined}
                        className={`w-8 h-8 text-xs font-semibold rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]
                          ${page === safePage
                            ? 'bg-[#2e5496] text-white border-[#2e5496]'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        data-testid={`pagination-page-${page}`}
                      >
                        {page}
                      </button>
                    )
                  )}

                  {/* Next */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    aria-label="Go to next page"
                    aria-disabled={safePage >= totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
                    data-testid="pagination-next"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </main>

      {deleteTarget && (
        <ConfirmDeleteDialog
          computer={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
