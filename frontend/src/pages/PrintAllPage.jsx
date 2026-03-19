import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import '../styles/form.css';

const LOGO = 'https://customer-assets.emergentagent.com/job_a73babea-9e6d-474e-b216-bf87e9a53159/artifacts/d22ptam1_logo.png';

function Checkbox({ checked, label }) {
  return (
    <input
      type="checkbox"
      readOnly
      checked={!!checked}
      aria-label={label}
      tabIndex={-1}
    />
  );
}

function RecordSheet({ c }) {
  return (
    <div className="page-wrapper">
      {/* ── Page 1 Header ── */}
      <header className="page-header">
        <div className="ph-title">
          <h1>Computers 4 Kids</h1>
          <p>2455 W Capitol Ave, West Sacramento, CA, 95691 <br /> (916) 572-1152 | Mon-Fri 10am-6pm</p>
        </div>
        <div className="ph-logo">
          <img src={LOGO} alt="Computers 4 Kids logo" />
        </div>
      </header>

      <div className="page-body">
        {/* Recipient Information */}
        <div className="recipient-info">
          <div className="form-field">
            <label className="w-200">Recipient Name:</label>
            <input type="text" className="bg-filled" value={c.recipient_name || ''} readOnly />
          </div>
          <div className="form-field">
            <label className="w-200">Parent Name (if under 18):</label>
            <input type="text" className="bg-filled" value={c.parent_name || ''} readOnly />
          </div>
          <div className="form-group">
            <div className="form-field flex-1">
              <label className="w-80">School:</label>
              <input type="text" className="bg-filled" value={c.school || ''} readOnly />
            </div>
            <div className="form-field">
              <label>ID:</label>
              <input type="text" className="bg-filled" value={c.school_id || ''} readOnly />
            </div>
          </div>
          <div className="form-field">
            <label className="w-80">Address:</label>
            <input type="text" className="bg-filled" value={c.address || ''} readOnly />
          </div>
          <div className="form-group">
            <div className="form-field">
              <label className="w-80">City:</label>
              <input type="text" className="bg-filled" value={c.city || ''} readOnly />
            </div>
            <div className="form-field">
              <label>State:</label>
              <input type="text" className="bg-filled" value={c.state || ''} readOnly />
            </div>
            <div className="form-field">
              <label>ZIP:</label>
              <input type="text" className="bg-filled" value={c.zip_code || ''} readOnly />
            </div>
          </div>
          <div className="form-field">
            <label className="w-80">Phone #:</label>
            <input type="text" className="bg-filled" value={c.phone || ''} readOnly />
          </div>
        </div>

        <p className="note bg-yellow my-20">(Recipient: Please print clearly your information above)</p>

        {/* Software Information */}
        <div className="softwares-info">
          <table>
            <tbody>
              <tr>
                <td>Operating System:</td>
                <td>
                  <div className="form-group">
                    <div className="form-checkbox"><Checkbox checked={c.os_win10} label="Windows 10" /><span>Win 10</span></div>
                    <div className="form-checkbox"><Checkbox checked={c.os_win11} label="Windows 11" /><span>Win 11</span></div>
                  </div>
                </td>
                <td>
                  <div className="form-group">
                    <div className="form-checkbox"><Checkbox checked={c.os_home} label="Home edition" /><span>Home</span></div>
                    <div className="form-checkbox"><Checkbox checked={c.os_pro} label="Pro edition" /><span>Pro</span></div>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Serial No.</td>
                <td className="p-0 bg-filled">
                  <input type="text" className="border-0 bg-filled" value={c.serial_no || ''} readOnly />
                </td>
                <td>
                  <div className="form-group">
                    <div className="form-checkbox"><Checkbox checked={c.os_activated} label="OS Activated" /><span>Activated</span></div>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Set Up OpenDNS:</td>
                <td colSpan={2}>
                  <div className="form-group">
                    <div className="form-checkbox"><Checkbox checked={c.opendns_preferred} label="Preferred DNS" /><span>Preferred Server: <i>208.67.222.123</i></span></div>
                    <div className="form-checkbox"><Checkbox checked={c.opendns_alternate} label="Alternate DNS" /><span>Alternate Server: <i>208.67.220.123</i></span></div>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Programs Installed:</td>
                <td colSpan={2}>
                  <div className="form-group flex-wrap programs">
                    {[['program_firefox','Firefox'],['program_chrome','Chrome'],['program_avira','Avira'],
                      ['program_libre_office','Libre Office'],['program_cd_burner_xp','CDBurner XP'],
                      ['program_java','Java'],['program_vlc_player','VLC Player'],
                    ].map(([field, label]) => (
                      <div key={field} className="form-checkbox">
                        <Checkbox checked={c[field]} label={label} /><span>{label}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Computer Information */}
        <div className="computer-info">
          <h2 className="h2 bg-primary">Computer Information</h2>
          <div className="computer-info-body">
            <div className="col">
              <fieldset>
                <legend className="sr-only">Computer type</legend>
                <div className="form-group bordered justify-center">
                  <div className="form-checkbox"><Checkbox checked={c.desktop_computer} label="Desktop" /><span>Desktop</span></div>
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 110, paddingLeft: 10 }}>Manufacturer:</label>
                  <input type="text" className="bg-filled" value={c.manufacturer || ''} readOnly />
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 110, paddingLeft: 10, paddingTop: 6 }}>CPU Cores:</label>
                  <input type="text" className="bg-filled" value={c.cpu_cores || ''} readOnly />
                </div>
                <div className="form-group align-center">
                  <label style={{ minWidth: 110, paddingLeft: 10 }}>CPU Speed:</label>
                  <div className="form-field cg-5">
                    <input type="text" className="bg-filled" value={c.cpu_speed || ''} readOnly />
                    <span>GHz</span>
                  </div>
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 110, paddingLeft: 10, paddingTop: 6 }}>CPU Name:</label>
                  <input type="text" className="bg-filled" value={c.cpu_name || ''} readOnly />
                </div>
                <div className="form-group align-center">
                  <label style={{ minWidth: 110, paddingLeft: 10 }}>Touch-screen:</label>
                  <div className="form-group bordered">
                    <div className="form-checkbox"><Checkbox checked={c.touch_screen_yes} label="Yes" /><span>Yes</span></div>
                    <div className="form-checkbox"><Checkbox checked={c.touch_screen_no} label="No" /><span>No</span></div>
                  </div>
                </div>
              </fieldset>
              <fieldset>
                <legend className="sr-only">Processing info</legend>
                <div className="form-field">
                  <label style={{ minWidth: 110, paddingLeft: 10, paddingTop: 6 }}>Imaged By:</label>
                  <input type="text" className="bg-filled" value={c.imaged_by || ''} readOnly />
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 110, paddingLeft: 10, paddingTop: 6 }}>Reviewed By:</label>
                  <input type="text" className="bg-filled" value={c.reviewed_by || ''} readOnly />
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 110, paddingLeft: 10, paddingTop: 6 }}>Delivered By:</label>
                  <input type="text" className="bg-filled" value={c.delivered_by || ''} readOnly />
                </div>
              </fieldset>
            </div>
            <div className="col">
              <fieldset>
                <legend className="sr-only">Computer specifications</legend>
                <div className="form-group bordered justify-center">
                  <div className="form-checkbox"><Checkbox checked={c.laptop_computer} label="Laptop" /><span>Laptop</span></div>
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 130, paddingLeft: 10, paddingTop: 6 }}>Modal:</label>
                  <input type="text" className="bg-filled" value={c.modal || ''} readOnly />
                </div>
                <div className="form-group align-center">
                  <label style={{ minWidth: 130, paddingLeft: 10 }}>RAM:</label>
                  <div className="form-field flex-1 cg-5">
                    <input type="text" className="bg-filled" value={c.ram || ''} readOnly />
                    <span>GB</span>
                  </div>
                </div>
                <div className="form-group align-center">
                  <label style={{ minWidth: 130, paddingLeft: 10 }}>Storage:</label>
                  <div className="form-group">
                    <div className="form-checkbox"><Checkbox checked={c.storage_hdd} label="HDD" /><span>HDD</span></div>
                    <div className="form-checkbox"><Checkbox checked={c.storage_ssd} label="SSD" /><span>SSD</span></div>
                    <div className="form-field cg-5">
                      <input type="text" className="bg-filled" value={c.storage_size || ''} readOnly />
                      <span>GB</span>
                    </div>
                  </div>
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 130, paddingLeft: 10, paddingTop: 6 }}>BIOS Version:</label>
                  <input type="text" className="bg-filled" value={c.bios_version || ''} readOnly />
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 130, paddingLeft: 10, paddingTop: 6 }}>Special Features:</label>
                  <input type="text" className="bg-filled" value={c.special_features || ''} readOnly />
                </div>
              </fieldset>
              <fieldset>
                <legend className="sr-only">Dates</legend>
                <div className="form-field">
                  <label style={{ minWidth: 130, paddingLeft: 10, paddingTop: 6 }}>Date Imaged:</label>
                  <input type="text" className="bg-filled" value={c.date_imaged || ''} readOnly />
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 130, paddingLeft: 10, paddingTop: 6 }}>Date Reviewed:</label>
                  <input type="text" className="bg-filled" value={c.date_reviewed || ''} readOnly />
                </div>
                <div className="form-field">
                  <label style={{ minWidth: 130, paddingLeft: 10, paddingTop: 6 }}>Date Delivered:</label>
                  <input type="text" className="bg-filled" value={c.date_delivered || ''} readOnly />
                </div>
              </fieldset>
            </div>
          </div>
        </div>

        <p className="page-bottom-note text-center">
          **Technicians - Don&apos;t forget to complete the Orientation Guidelines on the backside of this sheet**
        </p>
      </div>

      {/* ── Page 2: Orientation Guidelines ── */}
      <header className="page-header ph-secondary">
        <div className="ph-logo">
          <img src={LOGO} alt="Computers 4 Kids logo" />
        </div>
        <div className="ph-title">
          <h1>Orientation Instructional Guidelines</h1>
          <p>For Support: Computers 4 Kids, 2455 W Capitol Ave, West Sacramento, CA, 95691 <br /> Phone: (916) 572-1152 | Mon-Fri 10am-6pm</p>
        </div>
        <div className="ph-logo" />
      </header>

      <div className="page-body">
        <p className="note mt-0"><strong>Please Ensure All Documents are Signed</strong></p>

        <div className="oig">
          <h2 className="h2 bg-primary">Boot Up Procedures</h2>
          <div className="form-checkbox align-start">
            <Checkbox checked={c.oig_1_1} label="Boot up procedures completed" />
            <span>Point out the power on button for the System Unit and Monitor, both should already be on.</span>
          </div>
        </div>

        <div className="oig">
          <h2 className="h2 bg-primary">Opening Applications</h2>
          {[
            [c.oig_2_1, 'oig-2-1', (<>
              <p>Point out the two mouse buttons and describe how they differ:</p>
              <ol><li>Left button to click (select) and double-click(open/activate)</li><li>Right button to get submenu</li></ol>
            </>)],
            [c.oig_2_2, 'oig-2-2', 'Have them use the Start button>All Programs>Open Libre Office>Open Writer to open an application for document creation. Have them create a simple document and save it to the desktop.'],
            [c.oig_2_3, 'oig-2-3', 'Close Writer saving any changes, and have them locate it using File Explorer.'],
            [c.oig_2_4, 'oig-2-4', 'Delete it and close File Explorer.'],
          ].map(([checked, key, label]) => (
            <div key={key} className="form-checkbox align-start">
              <Checkbox checked={checked} label={`OIG item ${key}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="oig">
          <h2 className="h2 bg-primary">Describe How Restart Can Help Correct Some Computer Problems Like Slow Performance. Demonstrate Proper Shutdown Procedures</h2>
          {[
            [c.oig_3_1, 'Click the Start Button> Power button and describe the difference between restart and shutdown.'],
            [c.oig_3_2, 'Describe how restart can help correct some computer problems like slow performance and Operating Systems and Application malfunctions.'],
            [c.oig_3_3, 'Explain how to shut the system down in case of lock up: Press and hold the System Unit power button in until the system turns off.'],
          ].map(([checked, text], i) => (
            <div key={i} className="form-checkbox align-start">
              <Checkbox checked={checked} label={`OIG shutdown step ${i + 1}`} />
              <span>{text}</span>
            </div>
          ))}
          <div className="form-checkbox align-start">
            <Checkbox checked={c.oig_3_4} label="OIG wireless internet" />
            <span>
              <p>Ask if they have a wireless internet connection at home:</p>
              <ol><li>If yes: Confirm it works.</li><li>Show them: How they can connect to their access point.</li></ol>
            </span>
          </div>
          {[
            [c.oig_3_5, "Open the CD-ROM of the computer and if there's a CD in it then take it out."],
            [c.oig_3_6, 'Have them shut down the computer properly and guide them through the disassembly and help pack it up for transport.'],
            [c.oig_3_7, 'Make sure they know that many of the components should be handled carefully to ensure the unit does not break during transport.'],
          ].map(([checked, text], i) => (
            <div key={`oig3b-${i}`} className="form-checkbox align-start">
              <Checkbox checked={checked} label={`OIG shutdown step ${i + 5}`} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PrintAllPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const records = location.state?.records;
  const [printHint, setPrintHint] = useState(false);

  // Redirect if navigated directly with no state
  useEffect(() => {
    if (!records || records.length === 0) {
      navigate('/', { replace: true });
    }
  }, [records, navigate]);

  // Auto-trigger print after render
  useEffect(() => {
    if (!records || records.length === 0) return;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [records]);

  const handlePrint = () => {
    setPrintHint(true);
    window.print();
  };

  if (!records || records.length === 0) return null;

  return (
    <div className="c4k-print-root">
      <div className="c4k-form-root">
        {/* Action buttons — hidden on print */}
        <div className="action-buttons no-print" role="toolbar" aria-label="Batch print actions">
          <button
            type="button"
            className="button"
            onClick={() => navigate('/')}
            aria-label="Go back to dashboard"
            data-testid="print-all-back-button"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Dashboard
          </button>
          <span className="no-print" style={{ fontSize: 13, color: '#555', alignSelf: 'center' }}>
            {records.length} record{records.length !== 1 ? 's' : ''} ready to print
          </span>
          <button
            type="button"
            className="button button-primary"
            onClick={handlePrint}
            aria-label={`Print all ${records.length} records`}
            data-testid="print-all-trigger-button"
          >
            <Printer size={16} aria-hidden="true" />
            Print All
          </button>
        </div>
        {printHint && (
          <p
            className="no-print"
            role="alert"
            aria-live="polite"
            style={{ margin: '4px 20px 0', fontSize: 11, color: '#555' }}
          >
            If the print dialog did not open, press Ctrl+P (Windows) or Cmd+P (Mac).
          </p>
        )}

        {/* Render each record — page break after every record except the last */}
        {records.map((c, idx) => (
          <div
            key={c.serial_no || idx}
            className={idx < records.length - 1 ? 'c4k-batch-break' : ''}
            data-testid={`batch-record-${c.serial_no}`}
          >
            <RecordSheet c={c} />
          </div>
        ))}
      </div>
    </div>
  );
}
