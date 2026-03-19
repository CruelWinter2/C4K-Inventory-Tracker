import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Save, ArrowLeft, Calendar } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/form.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INITIAL_FORM = {
  serial_no: '', recipient_name: '', parent_name: '',
  school: '', school_id: '', address: '',
  city: '', state: '', zip_code: '', phone: '',
  os_win10: false, os_win11: false, os_home: false, os_pro: false, os_activated: false,
  opendns_preferred: false, opendns_alternate: false,
  program_firefox: false, program_chrome: false, program_avira: false,
  program_libre_office: false, program_cd_burner_xp: false, program_java: false, program_vlc_player: false,
  desktop_computer: false, laptop_computer: false,
  manufacturer: '', cpu_cores: '', cpu_speed: '', cpu_name: '',
  touch_screen_yes: false, touch_screen_no: false,
  imaged_by: '', reviewed_by: '', delivered_by: '',
  modal: '', ram: '',
  storage_hdd: false, storage_ssd: false, storage_size: '',
  bios_version: '', special_features: '',
  date_imaged: '', date_reviewed: '', date_delivered: '',
  oig_1_1: false,
  oig_2_1: false, oig_2_2: false, oig_2_3: false, oig_2_4: false,
  oig_3_1: false, oig_3_2: false, oig_3_3: false, oig_3_4: false, oig_3_5: false, oig_3_6: false, oig_3_7: false,
  inventory_status: 'Processing',
};

const STATUSES = ['Processing', 'In Stock', 'Donated', 'Sold', 'Pending Review', 'Pending Delivery'];

function today() {
  return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export default function IntakeFormPage() {
  const { serialNo } = useParams();
  const isEdit = Boolean(serialNo);
  const decodedSerial = isEdit ? decodeURIComponent(serialNo) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [audit, setAudit] = useState({ created_at: null, updated_at: null, created_by: null, updated_by: null });
  const [logOpen, setLogOpen] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((msg) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(''), 3000);
  }, []);

  // Load existing record when editing
  useEffect(() => {
    if (!isEdit) return;
    axios.get(`${API}/computers/${encodeURIComponent(decodedSerial)}`)
      .then(res => {
        const { id, created_at, updated_at, created_by, updated_by, ...fields } = res.data;
        setFormData({ ...INITIAL_FORM, ...fields });
        setAudit({ created_at, updated_at, created_by, updated_by });
      })
      .catch(() => toast.error('Failed to load computer record'))
      .finally(() => setLoading(false));
  }, [isEdit, decodedSerial]);

  const handleChange = useCallback((e) => {
    const { id, name, type, checked, value } = e.target;
    // Use data-field attribute if present, otherwise fall back to id
    const field = e.target.dataset.field || id || name;
    setFormData(prev => ({
      ...prev,
      [field]: type === 'checkbox' ? checked : value,
    }));
  }, []);

  const setToday = useCallback((field) => {
    setFormData(prev => ({ ...prev, [field]: today() }));
    announce(`${field.replace(/_/g, ' ')} set to today`);
  }, [announce]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.serial_no.trim()) {
      toast.error('Serial No. is required');
      document.getElementById('serial_no')?.focus();
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/computers/${encodeURIComponent(decodedSerial)}`, formData);
        toast.success('Record updated successfully');
      } else {
        await axios.post(`${API}/computers`, formData);
        toast.success('Computer record saved successfully');
      }
      announce('Record saved. Returning to dashboard.');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save record';
      toast.error(msg);
      announce(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <Sidebar onExport={() => {}} />
        <main className="ml-64 flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#2e5496] border-t-transparent rounded-full animate-spin" role="status" />
            <p className="text-[#2e5496] font-semibold">Loading record...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <Sidebar onExport={() => {}} />

      <main className="ml-64 flex-1 flex flex-col" id="main-content">
        {/* aria-live region for screen reader announcements */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>

        <div className="c4k-form-root">
          <form onSubmit={handleSave} noValidate aria-label={isEdit ? 'Edit computer record' : 'Add new computer record'}>

            {/* ── Action Buttons ── */}
            <div className="action-buttons no-print" role="toolbar" aria-label="Form actions">
              <button
                type="button"
                className="button"
                onClick={() => navigate('/')}
                aria-label="Go back to dashboard without saving"
                data-testid="back-button"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Dashboard
              </button>

              {/* Editing mode indicator */}
              {isEdit && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                  style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #FFEEBA' }}
                  aria-label={`Editing record: ${decodedSerial}`}
                  data-testid="editing-badge"
                >
                  Editing: {decodedSerial}
                </span>
              )}

              <div className="flex items-center gap-2 ml-4">
                <label htmlFor="form-status" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Status:
                </label>
                <select
                  id="form-status"
                  value={formData.inventory_status}
                  onChange={e => setFormData(prev => ({ ...prev, inventory_status: e.target.value }))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:border-[#2e5496] focus:ring-1 focus:ring-[#2e5496] bg-white"
                  aria-label="Computer inventory status"
                  data-testid="form-status-select"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s} disabled={!isAdmin && (s === 'Donated' || s === 'Sold')}>
                      {s}{!isAdmin && (s === 'Donated' || s === 'Sold') ? ' (admin only)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="button button-primary ml-auto"
                aria-label={isEdit ? 'Save changes to this record' : 'Save new computer record'}
                data-testid="save-record-button"
              >
                <Save size={16} aria-hidden="true" />
                {saving ? 'Saving...' : isEdit ? 'Update Record' : 'Save Record'}
              </button>
            </div>

            {/* ── Page 1 Header ── */}
            <div className="page-wrapper">
              <header className="page-header" role="banner">
                <div className="ph-title">
                  <h1>Computers 4 Kids</h1>
                  <p>2455 W Capitol Ave, West Sacramento, CA, 95691 <br /> (916) 572-1152 | Mon-Fri 10am-6pm</p>
                </div>
                <div className="ph-logo" aria-hidden="true">
                  <img src="https://customer-assets.emergentagent.com/job_a73babea-9e6d-474e-b216-bf87e9a53159/artifacts/d22ptam1_logo.png" alt="Computers 4 Kids logo" />
                </div>
              </header>

              <div className="page-body">

                {/* ── Recipient Information ── */}
                <section aria-labelledby="recipient-section-heading">
                  <h2 id="recipient-section-heading" className="sr-only">Recipient Information</h2>
                  <div className="recipient-info">
                    <div className="form-field">
                      <label htmlFor="recipient_name" className="w-200">Recipient Name:</label>
                      <input type="text" id="recipient_name" className="bg-filled" value={formData.recipient_name} onChange={handleChange} autoComplete="name" data-testid="field-recipient-name" />
                    </div>
                    <div className="form-field">
                      <label htmlFor="parent_name" className="w-200">Parent Name (if under 18):</label>
                      <input type="text" id="parent_name" className="bg-filled" value={formData.parent_name} onChange={handleChange} autoComplete="off" />
                    </div>
                    <div className="form-group">
                      <div className="form-field flex-1">
                        <label htmlFor="school" className="w-80">School:</label>
                        <input type="text" id="school" className="bg-filled" value={formData.school} onChange={handleChange} />
                      </div>
                      <div className="form-field">
                        <label htmlFor="school_id">ID:</label>
                        <input type="text" id="school_id" className="bg-filled" value={formData.school_id} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="form-field">
                      <label htmlFor="address" className="w-80">Address:</label>
                      <input type="text" id="address" className="bg-filled" value={formData.address} onChange={handleChange} autoComplete="street-address" />
                    </div>
                    <div className="form-group">
                      <div className="form-field">
                        <label htmlFor="city" className="w-80">City:</label>
                        <input type="text" id="city" className="bg-filled" value={formData.city} onChange={handleChange} autoComplete="address-level2" />
                      </div>
                      <div className="form-field">
                        <label htmlFor="state">State:</label>
                        <input type="text" id="state" className="bg-filled" value={formData.state} onChange={handleChange} autoComplete="address-level1" />
                      </div>
                      <div className="form-field">
                        <label htmlFor="zip_code">ZIP:</label>
                        <input type="text" id="zip_code" className="bg-filled" value={formData.zip_code} onChange={handleChange} autoComplete="postal-code" />
                      </div>
                    </div>
                    <div className="form-field">
                      <label htmlFor="phone" className="w-80">Phone #:</label>
                      <input type="text" id="phone" className="bg-filled" value={formData.phone} onChange={handleChange} autoComplete="tel" />
                    </div>
                  </div>
                </section>

                <p className="note bg-yellow my-20">(Recipient: Please print clearly your information above)</p>

                {/* ── Software Information ── */}
                <section aria-labelledby="software-section-heading" className="softwares-info">
                  <h2 id="software-section-heading" className="sr-only">Software Information</h2>
                  <table>
                    <tbody>
                      <tr>
                        <td>Operating System:</td>
                        <td>
                          <div className="form-group">
                            <div className="form-checkbox">
                              <input type="checkbox" name="os" id="win10" data-field="os_win10" checked={formData.os_win10} onChange={handleChange} />
                              <label htmlFor="win10">Win 10</label>
                            </div>
                            <div className="form-checkbox">
                              <input type="checkbox" name="os" id="win11" data-field="os_win11" checked={formData.os_win11} onChange={handleChange} />
                              <label htmlFor="win11">Win 11</label>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="form-group">
                            <div className="form-checkbox">
                              <input type="checkbox" name="os-version" id="win_home" data-field="os_home" checked={formData.os_home} onChange={handleChange} />
                              <label htmlFor="win_home">Home</label>
                            </div>
                            <div className="form-checkbox">
                              <input type="checkbox" name="os-version" id="win_pro" data-field="os_pro" checked={formData.os_pro} onChange={handleChange} />
                              <label htmlFor="win_pro">Pro</label>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <label htmlFor="serial_no">Serial No.</label>
                          {!isEdit && <span aria-hidden="true" className="text-red-500 ml-1">*</span>}
                        </td>
                        <td className="p-0 bg-filled">
                          <input
                            type="text"
                            id="serial_no"
                            className="border-0 bg-filled"
                            value={formData.serial_no}
                            onChange={handleChange}
                            readOnly={isEdit}
                            aria-required="true"
                            aria-label={isEdit ? 'Serial number (read-only in edit mode)' : 'Serial number (required)'}
                            style={isEdit ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                            data-testid="field-serial-no"
                          />
                        </td>
                        <td>
                          <div className="form-group">
                            <div className="form-checkbox">
                              <input type="checkbox" name="os-activation" id="os_activated" checked={formData.os_activated} onChange={handleChange} />
                              <label htmlFor="os_activated">Activated</label>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>Set Up OpenDNS:</td>
                        <td colSpan={2}>
                          <div className="form-group">
                            <div className="form-checkbox">
                              <input type="checkbox" name="server-type" id="preferred_server" data-field="opendns_preferred" checked={formData.opendns_preferred} onChange={handleChange} />
                              <label htmlFor="preferred_server">Preferred Server: <i>208.67.222.123</i></label>
                            </div>
                            <div className="form-checkbox">
                              <input type="checkbox" name="server-type" id="alternate_server" data-field="opendns_alternate" checked={formData.opendns_alternate} onChange={handleChange} />
                              <label htmlFor="alternate_server">Alternate Server: <i>208.67.220.123</i></label>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>Programs Installed:</td>
                        <td colSpan={2}>
                          <div className="form-group flex-wrap programs">
                            {[
                              ['program_firefox', 'Firefox'], ['program_chrome', 'Chrome'],
                              ['program_avira', 'Avira'], ['program_libre_office', 'Libre Office'],
                              ['program_cd_burner_xp', 'CDBurner XP'], ['program_java', 'Java'],
                              ['program_vlc_player', 'VLC Player'],
                            ].map(([field, label]) => (
                              <div key={field} className="form-checkbox">
                                <input type="checkbox" name="programs" id={field} checked={formData[field]} onChange={handleChange} />
                                <label htmlFor={field}>{label}</label>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* ── Computer Information ── */}
                <section aria-labelledby="computer-info-heading" className="computer-info">
                  <h2 id="computer-info-heading" className="h2 bg-primary">Computer Information</h2>
                  <div className="computer-info-body">

                    {/* Left column */}
                    <div className="col">
                      <fieldset>
                        <legend className="sr-only">Computer type</legend>
                        <div className="form-group bordered justify-center">
                          <div className="form-checkbox">
                            <input type="checkbox" name="desktop-computer" id="desktop_computer" checked={formData.desktop_computer} onChange={handleChange} />
                            <label htmlFor="desktop_computer">Desktop</label>
                          </div>
                        </div>
                        <div className="form-field">
                          <label htmlFor="manufacturer">Manufacturer:</label>
                          <input type="text" id="manufacturer" className="bg-filled" value={formData.manufacturer} onChange={handleChange} data-testid="field-manufacturer" />
                        </div>
                        <div className="form-field">
                          <label htmlFor="cpu_cores">CPU Cores:</label>
                          <input type="text" id="cpu_cores" className="bg-filled" value={formData.cpu_cores} onChange={handleChange} />
                        </div>
                        <div className="form-group align-center">
                          <label htmlFor="cpu_speed">CPU Speed:</label>
                          <div className="form-field cg-5">
                            <input type="text" id="cpu_speed" className="bg-filled" value={formData.cpu_speed} onChange={handleChange} aria-label="CPU Speed in GHz" />
                            <label htmlFor="cpu_speed" aria-hidden="true">GHz</label>
                          </div>
                        </div>
                        <div className="form-field">
                          <label htmlFor="cpu_name">CPU Name:</label>
                          <input type="text" id="cpu_name" className="bg-filled" value={formData.cpu_name} onChange={handleChange} />
                        </div>
                        <div className="form-group align-center">
                          <label id="touchscreen-label">Touch-screen:</label>
                          <div className="form-group bordered" role="group" aria-labelledby="touchscreen-label">
                            <div className="form-checkbox">
                              <input type="checkbox" name="touch-screen" id="touch_screen_yes" checked={formData.touch_screen_yes} onChange={handleChange} />
                              <label htmlFor="touch_screen_yes">Yes</label>
                            </div>
                            <div className="form-checkbox">
                              <input type="checkbox" name="touch-screen" id="touch_screen_no" checked={formData.touch_screen_no} onChange={handleChange} />
                              <label htmlFor="touch_screen_no">No</label>
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      <fieldset>
                        <legend className="sr-only">Processing and delivery information</legend>
                        <div className="form-field">
                          <label htmlFor="imaged_by">Imaged By:</label>
                          <input type="text" id="imaged_by" className="bg-filled" value={formData.imaged_by} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="reviewed_by">Reviewed By:</label>
                          <input type="text" id="reviewed_by" className="bg-filled" value={formData.reviewed_by} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="delivered_by">Delivered By:</label>
                          <input type="text" id="delivered_by" className="bg-filled" value={formData.delivered_by} onChange={handleChange} />
                        </div>
                      </fieldset>
                    </div>

                    {/* Right column */}
                    <div className="col">
                      <fieldset>
                        <legend className="sr-only">Computer specifications</legend>
                        <div className="form-group bordered justify-center">
                          <div className="form-checkbox">
                            <input type="checkbox" name="laptop-computer" id="laptop_computer" checked={formData.laptop_computer} onChange={handleChange} />
                            <label htmlFor="laptop_computer">Laptop</label>
                          </div>
                        </div>
                        <div className="form-field">
                          <label htmlFor="modal">Modal:</label>
                          <input type="text" id="modal" className="bg-filled" value={formData.modal} onChange={handleChange} data-testid="field-modal" />
                        </div>
                        <div className="form-group align-center">
                          <label htmlFor="ram">RAM:</label>
                          <div className="form-field flex-1 cg-5">
                            <input type="text" id="ram" className="bg-filled" value={formData.ram} onChange={handleChange} aria-label="RAM in GB" />
                            <label htmlFor="ram" aria-hidden="true">GB</label>
                          </div>
                        </div>
                        <div className="form-group align-center">
                          <label id="storage-label">Storage:</label>
                          <div className="form-group" role="group" aria-labelledby="storage-label">
                            <div className="form-checkbox">
                              <input type="checkbox" name="Storage-type" id="storage_hdd" checked={formData.storage_hdd} onChange={handleChange} />
                              <label htmlFor="storage_hdd">HDD</label>
                            </div>
                            <div className="form-checkbox">
                              <input type="checkbox" name="Storage-type" id="storage_ssd" checked={formData.storage_ssd} onChange={handleChange} />
                              <label htmlFor="storage_ssd">SSD</label>
                            </div>
                            <div className="form-field cg-5">
                              <input type="text" id="storage_size" className="bg-filled" value={formData.storage_size} onChange={handleChange} aria-label="Storage size in GB" />
                              <label htmlFor="storage_size" aria-hidden="true">GB</label>
                            </div>
                          </div>
                        </div>
                        <div className="form-field">
                          <label htmlFor="bios_version">BIOS Version:</label>
                          <input type="text" id="bios_version" className="bg-filled" value={formData.bios_version} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                          <label htmlFor="special_features">Special Features:</label>
                          <input type="text" id="special_features" className="bg-filled" value={formData.special_features} onChange={handleChange} />
                        </div>
                      </fieldset>

                      <fieldset>
                        <legend className="sr-only">Dates</legend>
                        {/* Date Imaged */}
                        <div className="form-group align-center">
                          <div className="form-field" style={{ flex: 1 }}>
                            <label htmlFor="date_imaged">Date Imaged:</label>
                            <input type="text" id="date_imaged" className="bg-filled" value={formData.date_imaged} onChange={handleChange} placeholder="MM/DD/YYYY" aria-describedby="date-imaged-hint" />
                          </div>
                          <button
                            type="button"
                            className="today-btn"
                            onClick={() => setToday('date_imaged')}
                            aria-label="Set Date Imaged to today"
                            data-testid="today-date-imaged"
                          >
                            <Calendar size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 3 }} />
                            Today
                          </button>
                          <span id="date-imaged-hint" className="sr-only">Format: MM/DD/YYYY. Use Today button to auto-fill.</span>
                        </div>
                        {/* Date Reviewed */}
                        <div className="form-group align-center">
                          <div className="form-field" style={{ flex: 1 }}>
                            <label htmlFor="date_reviewed">Date Reviewed:</label>
                            <input type="text" id="date_reviewed" className="bg-filled" value={formData.date_reviewed} onChange={handleChange} placeholder="MM/DD/YYYY" aria-describedby="date-reviewed-hint" />
                          </div>
                          <button
                            type="button"
                            className="today-btn"
                            onClick={() => setToday('date_reviewed')}
                            aria-label="Set Date Reviewed to today"
                            data-testid="today-date-reviewed"
                          >
                            <Calendar size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 3 }} />
                            Today
                          </button>
                          <span id="date-reviewed-hint" className="sr-only">Format: MM/DD/YYYY. Use Today button to auto-fill.</span>
                        </div>
                        {/* Date Delivered */}
                        <div className="form-group align-center">
                          <div className="form-field" style={{ flex: 1 }}>
                            <label htmlFor="date_delivered">Date Delivered:</label>
                            <input type="text" id="date_delivered" className="bg-filled" value={formData.date_delivered} onChange={handleChange} placeholder="MM/DD/YYYY" aria-describedby="date-delivered-hint" />
                          </div>
                          <button
                            type="button"
                            className="today-btn"
                            onClick={() => setToday('date_delivered')}
                            aria-label="Set Date Delivered to today"
                            data-testid="today-date-delivered"
                          >
                            <Calendar size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 3 }} />
                            Today
                          </button>
                          <span id="date-delivered-hint" className="sr-only">Format: MM/DD/YYYY. Use Today button to auto-fill.</span>
                        </div>
                      </fieldset>
                    </div>
                  </div>
                </section>

                <p className="page-bottom-note text-center">
                  **Technicians - Don&apos;t forget to complete the Orientation Guidelines on the backside of this sheet**
                </p>
              </div>

              {/* ── Page 2 Header (Orientation Guidelines) ── */}
              <header className="page-header ph-secondary">
                <div className="ph-logo" aria-hidden="true">
                  <img src="https://customer-assets.emergentagent.com/job_a73babea-9e6d-474e-b216-bf87e9a53159/artifacts/d22ptam1_logo.png" alt="Computers 4 Kids logo" />
                </div>
                <div className="ph-title">
                  <h1>Orientation Instructional Guidelines</h1>
                  <p>For Support: Computers 4 Kids, 2455 W Capitol Ave, West Sacramento, CA, 95691 <br /> Phone: (916) 572-1152 | Mon-Fri 10am-6pm</p>
                </div>
                <div className="ph-logo" aria-hidden="true" />
              </header>

              <div className="page-body">
                <p className="note mt-0"><strong>Please Ensure All Documents are Signed</strong></p>

                {/* ── OIG Sections ── */}
                <section aria-label="Orientation guidelines" className="oig">
                  <h2 className="h2 bg-primary">Boot Up Procedures</h2>
                  <div className="form-checkbox align-start">
                    <input type="checkbox" name="oig-1" id="oig_1_1" checked={formData.oig_1_1} onChange={handleChange} />
                    <label htmlFor="oig_1_1">Point out the power on button for the System Unit and Monitor, both should already be on.</label>
                  </div>
                </section>

                <div className="oig">
                  <h2 className="h2 bg-primary">Opening Applications</h2>
                  <div className="form-checkbox align-start">
                    <input type="checkbox" name="oig-2" id="oig_2_1" checked={formData.oig_2_1} onChange={handleChange} />
                    <label htmlFor="oig_2_1">
                      <p>Point out the two mouse buttons and describe how they differ:</p>
                      <ol>
                        <li>Left button to click (select) and double-click(open/activate)</li>
                        <li>Right button to get submenu</li>
                      </ol>
                    </label>
                  </div>
                  <div className="form-checkbox align-start">
                    <input type="checkbox" name="oig-2" id="oig_2_2" checked={formData.oig_2_2} onChange={handleChange} />
                    <label htmlFor="oig_2_2">Have them use the Start button&gt;All Programs&gt;Open Libre Office&gt;Open Writer to open an application for document creation. Have them create a simple document and save it to the desktop.</label>
                  </div>
                  <div className="form-checkbox align-start">
                    <input type="checkbox" name="oig-2" id="oig_2_3" checked={formData.oig_2_3} onChange={handleChange} />
                    <label htmlFor="oig_2_3">Close Writer saving any changes, and have them locate it using File Explorer.</label>
                  </div>
                  <div className="form-checkbox align-start">
                    <input type="checkbox" name="oig-2" id="oig_2_4" checked={formData.oig_2_4} onChange={handleChange} />
                    <label htmlFor="oig_2_4">Delete it and close File Explorer.</label>
                  </div>
                </div>

                <div className="oig">
                  <h2 className="h2 bg-primary">Describe How Restart Can Help Correct Some Computer Problems Like Slow Performance. Demonstrate Proper Shutdown Procedures</h2>
                  {[
                    ['oig_3_1', 'Click the Start Button> Power button and describe the difference between restart and shutdown.'],
                    ['oig_3_2', 'Describe how restart can help correct some computer problems like slow performance and Operating Systems and Application malfunctions.'],
                    ['oig_3_3', 'Explain how to shut the system down in case of lock up: Press and hold the System Unit power button in until the system turns off.'],
                  ].map(([field, labelText]) => (
                    <div key={field} className="form-checkbox align-start">
                      <input type="checkbox" name="oig-3" id={field} checked={formData[field]} onChange={handleChange} />
                      <label htmlFor={field}>{labelText}</label>
                    </div>
                  ))}
                  <div className="form-checkbox align-start">
                    <input type="checkbox" name="oig-3" id="oig_3_4" checked={formData.oig_3_4} onChange={handleChange} />
                    <label htmlFor="oig_3_4">
                      <p>Ask if they have a wireless internet connection at home:</p>
                      <ol>
                        <li>If yes: Confirm it works.</li>
                        <li>Show them: How they can connect to their access point.</li>
                      </ol>
                    </label>
                  </div>
                  {[
                    ['oig_3_5', 'Open the CD-ROM of the computer and if there\'s a CD in it then take it out.'],
                    ['oig_3_6', 'Have them shut down the computer properly and guide them through the disassembly and help pack it up for transport.'],
                    ['oig_3_7', 'Make sure they know that many of the components should be handled carefully to ensure the unit does not break during transport.'],
                  ].map(([field, labelText]) => (
                    <div key={field} className="form-checkbox align-start">
                      <input type="checkbox" name="oig-3" id={field} checked={formData[field]} onChange={handleChange} />
                      <label htmlFor={field}>{labelText}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Activity Log (collapsible) ── */}
              {isEdit && (audit.created_at || audit.updated_at) && (
                <div className="audit-log" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    onClick={() => setLogOpen(o => !o)}
                    aria-expanded={logOpen}
                    aria-controls="activity-log-content"
                    className="flex items-center gap-2 w-full text-left text-xs font-bold text-gray-600 hover:text-[#2e5496] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e5496] py-1"
                    data-testid="activity-log-toggle"
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-block',
                        transform: logOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                        fontSize: 10
                      }}
                    >
                      ▶
                    </span>
                    Activity Log
                  </button>

                  {logOpen && (
                    <div
                      id="activity-log-content"
                      role="region"
                      aria-label="Activity log for this computer record"
                      className="mt-3 space-y-2 text-xs text-gray-600 border-t border-gray-200 pt-3"
                      data-testid="activity-log-content"
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-[#2e5496] rounded-full mt-1 flex-shrink-0" aria-hidden="true" />
                        <p>
                          <strong className="text-gray-900">Record created</strong>
                          {audit.created_by && (
                            <> by <strong className="text-[#2e5496]">{audit.created_by}</strong></>
                          )}
                          {audit.created_at && (
                            <> on {new Date(audit.created_at).toLocaleString()}</>
                          )}
                        </p>
                      </div>
                      {audit.updated_at && audit.updated_at !== audit.created_at && (
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-amber-500 rounded-full mt-1 flex-shrink-0" aria-hidden="true" />
                          <p>
                            <strong className="text-gray-900">Last updated</strong>
                            {audit.updated_by && (
                              <> by <strong className="text-[#2e5496]">{audit.updated_by}</strong></>
                            )}
                            {audit.updated_at && (
                              <> on {new Date(audit.updated_at).toLocaleString()}</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
