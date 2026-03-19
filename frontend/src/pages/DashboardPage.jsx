import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Eye, Trash2, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

export default function DashboardPage() {
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  const fetchComputers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/computers`);
      setComputers(res.data);
    } catch {
      toast.error('Failed to load inventory. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComputers(); }, [fetchComputers]);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  // Apply search + status filter
  const filtered = computers.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !q || c.serial_no?.toLowerCase().includes(q) || c.recipient_name?.toLowerCase().includes(q);
    const matchesFilter = statusFilter === 'All' || c.inventory_status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * RECORDS_PER_PAGE;
  const pageRecords = filtered.slice(pageStart, pageStart + RECORDS_PER_PAGE);

  const handleStatusChange = async (serialNo, newStatus) => {
    try {
      await axios.patch(`${API}/computers/${encodeURIComponent(serialNo)}/status`, { status: newStatus });
      setComputers(prev => prev.map(c => c.serial_no === serialNo ? { ...c, inventory_status: newStatus } : c));
      toast.success(`Status updated to "${newStatus}"`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API}/computers/${encodeURIComponent(deleteTarget.serial_no)}`);
      setComputers(prev => prev.filter(c => c.serial_no !== deleteTarget.serial_no));
      toast.success(`Record "${deleteTarget.serial_no}" deleted`);
    } catch {
      toast.error('Failed to delete record');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/export/csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'c4k_inventory.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded successfully');
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const stats = {
    total: computers.length,
    processing: computers.filter(c => c.inventory_status === 'Processing').length,
    inStock: computers.filter(c => c.inventory_status === 'In Stock').length,
    donated: computers.filter(c => c.inventory_status === 'Donated').length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <Sidebar onExport={handleExport} />

      <main className="ml-64 flex-1 flex flex-col min-h-screen" id="main-content">
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
              disabled={exporting}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
              data-testid="export-csv-button"
              aria-label="Export all inventory records to a CSV file"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {exporting ? 'Exporting...' : 'Export CSV'}
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
          {/* Stats */}
          <section aria-label="Inventory statistics" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Records', value: stats.total, color: '#2e5496' },
              { label: 'Processing',    value: stats.processing, color: '#2e5496' },
              { label: 'In Stock',      value: stats.inStock, color: '#15803d' },
              { label: 'Donated',       value: stats.donated, color: '#7e22ce' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
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
                placeholder="Search by Serial No. or Recipient Name..."
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

          {/* Filter summary for screen readers */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {statusFilter !== 'All' ? `Showing ${statusFilter} computers only. ` : ''}
            {search ? `Searching for "${search}". ` : ''}
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'} found.
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
                        {search || statusFilter !== 'All' ? (
                          <div>
                            <p className="font-semibold text-gray-500 mb-1">No matching records found.</p>
                            <button
                              onClick={() => { setSearch(''); setStatusFilter('All'); }}
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
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
                            <button
                              onClick={() => setDeleteTarget(computer)}
                              aria-label={`Delete record for serial number ${computer.serial_no}`}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              data-testid={`delete-btn-${computer.serial_no}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
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
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500" aria-live="polite" aria-atomic="true">
                  Showing <strong>{pageStart + 1}–{Math.min(pageStart + RECORDS_PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> records
                  {statusFilter !== 'All' && <span className="text-[#2e5496]"> (filtered)</span>}
                </p>
                <nav aria-label="Pagination navigation" className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label={`Go to previous page, page ${safePage - 1}`}
                    aria-disabled={safePage <= 1}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
                    data-testid="pagination-prev"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    Previous
                  </button>

                  <span className="text-xs text-gray-600 font-medium px-1" aria-current="page">
                    Page {safePage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    aria-label={`Go to next page, page ${safePage + 1}`}
                    aria-disabled={safePage >= totalPages}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496]"
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
