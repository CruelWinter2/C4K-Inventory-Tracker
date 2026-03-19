# C4K Inventory Management System - PRD

## Project Overview
Full-stack Inventory Management System for **Computers 4 Kids (C4K)** nonprofit (West Sacramento, CA). Converts a static HTML computer intake/donation form into a secure, production-ready web application.

**Live URL:** https://c4k-intake-system.preview.emergentagent.com

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Tailwind CSS, Shadcn UI, Axios, Sonner (toasts) |
| Backend | FastAPI (Python), PyJWT, bcrypt, qrcode, Pillow |
| Database | MongoDB (Motor async driver) |
| Libraries | react-qr-code, lucide-react |

**Backend:** `/app/backend/server.py` (single-file FastAPI)  
**Frontend:** `/app/frontend/src/` (React SPA)

---

## Core Requirements (Static)

1. Exact HTML/CSS structure from original form preserved in IntakeFormPage and PrintViewPage
2. Serial No. as primary key for all database records
3. All fields remain text inputs (NO dropdowns in form fields)
4. WCAG 2.1 AA accessibility compliance throughout
5. QR codes generated for Serial No. on View/Print layout
6. Audit logging (created_at, updated_at, created_by) on all records
7. CSV export of full inventory
8. JWT authentication with first-login forced password reset

---

## User Flow

1. Visit `/` → Redirect to `/login`
2. Login with `admin` / `admin` (first time) → First-login password reset modal
3. Modal: Set strong password (8+ chars, uppercase, number) → Redirect to Dashboard
4. Dashboard: View all computers, search, change status inline, edit/view/delete
5. Add New Computer → Intake form with all original fields + Save Record → Dashboard
6. View/Print → Original HTML layout + QR code → Print
7. Export CSV → Download full inventory as .csv

---

## What's Been Implemented

### Authentication (2025-02)
- JWT-based login (`POST /api/auth/login`)
- First-login force password change modal with focus trap, `role="dialog"`, `aria-modal="true"`
- Password change endpoint (`POST /api/auth/change-password`)
- Auto-initialize admin user on backend startup
- Protected routes with ProtectedRoute component

### Dashboard (2025-02)
- Stats cards: Total, Processing, In Stock, Donated
- Inventory table: Serial No., Manufacturer, Model, Date Imaged, Recipient, Status, Actions
- Search bar (filters by Serial No. OR Recipient Name, instant)
- Inline status change via dropdown (6 statuses)
- Edit, View/Print, Delete buttons per row
- Delete confirmation dialog (accessible alertdialog)
- Export CSV (downloads `c4k_inventory.csv`)

### Intake Form (2025-02)
- Exact original HTML structure preserved with all CSS classes
- All form fields: Recipient Info, Software Info (OS, Serial No., OpenDNS, Programs), Computer Info, Orientation Guidelines
- Serial No. read-only in edit mode
- "Set to Today" buttons for Date Imaged, Date Reviewed, Date Delivered
- Status selector at top of form
- Save Record (POST) / Update Record (PUT)
- Audit log displayed at bottom in edit mode

### Print View (2025-02)
- Exact original HTML layout reproduced
- QR code generated from Serial No. (react-qr-code library)
- Print button triggers `window.print()`
- Print CSS hides sidebar, action buttons, audit log
- All field values displayed as read-only

### RBAC Technician Restrictions (2025-02)
- Delete button hidden from Dashboard for Technician role (admin-only via `isAdmin` check)
- `AdminRoute` component wraps `/users` — non-admins see accessible "Access Denied" screen
- Access Denied: `role="alert"`, `aria-live="assertive"`, 3-second countdown, auto-redirect to Dashboard
- User Management sidebar link already admin-only (from previous phase)
- Backend DELETE /admin/users already admin-only via `get_admin_user` dependency

### Advanced Pagination (2025-02)
- `getPageRange(current, total)` produces smart page list with ellipsis for >7 pages
- Each page button: `aria-label="Jump to page N"`, `aria-current="page"` for active page
- `data-testid="pagination-page-N"` on every page number button
- Previous: `aria-label="Go to previous page"`, Next: `aria-label="Go to next page"`
- Ellipsis rendered as `aria-hidden="true"` decorative spans

### Activity Log (2025-02)
- Collapsible section at bottom of IntakeFormPage (edit mode only)
- Toggle button with `aria-expanded` and `aria-controls="activity-log-content"`
- Shows: "Record created by [username] on [date]" and "Last updated by [username] on [date]"
- Backend: `updated_by` field saved to database on every PUT /api/computers/{serial_no}
- `updated_by` extracted from API response and displayed

### Accessibility Sweep (2025-02)
- Role badges in User Management: `aria-label="Role: Admin"` and `aria-label="Role: Technician"`
- Access Denied screen: `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"`
- `GET /api/admin/users` - list all users (admin-only)
- `POST /api/admin/users` - create user (must_change_password=true, admin-only)
- `PUT /api/admin/users/{username}/reset-password` - reset PW (forces change on next login)
- `DELETE /api/admin/users/{username}` - delete user (cannot delete own account)
- UserManagementPage with Add User / Reset PW / Delete modals (all accessible, focus-trapped)
- Role badges (Admin/Technician), Password Status (Active/Must Change), Created date
- User Management link in sidebar visible only to admin role users
- Admin role label "(ADMIN)" shown in sidebar footer

### Dashboard Enhancements (2025-02)
- Status filter toggles with aria-pressed: All Computers, In Stock Only, Sold Only
- Client-side pagination at 25 records per page
- Previous/Next buttons with full aria-labels (e.g., "Go to next page, page 2")
- "Page X of Y" counter, "Showing X–Y of Z records" count
- Page resets to 1 when search or filter changes
- aria-live region announces filter/search result count to screen readers
- Skip to main content link added to App.js

### Code Audit (2025-02)
- All new buttons: aria-label, data-testid
- All new modals: role="dialog", aria-modal="true", aria-labelledby, focus trap, Escape to close
- Delete confirmation: role="alertdialog"
- Login response now includes `role` field so sidebar renders correctly immediately after login
- All interactive elements have `data-testid` attributes
- All inputs have associated `<label>` elements with `htmlFor`/`id` binding
- Focus trap in password modal (Tab/Shift+Tab cycling)
- Auto-focus first input in modal
- `aria-live` regions for status announcements
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on modal
- `role="alertdialog"` on delete confirmation
- `aria-label` on all icon-only buttons
- Screen reader accessible search and table

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login → JWT + must_change_password flag |
| POST | /api/auth/change-password | Change password + clear must_change_password |
| GET | /api/auth/me | Get current user info |
| GET | /api/computers | List all computers |
| POST | /api/computers | Create computer record |
| GET | /api/computers/{serial_no} | Get single computer |
| PUT | /api/computers/{serial_no} | Update computer |
| PATCH | /api/computers/{serial_no}/status | Update status only |
| DELETE | /api/computers/{serial_no} | Delete computer |
| GET | /api/computers/{serial_no}/qr | Generate QR code (base64 PNG) |
| GET | /api/export/csv | Export all records as CSV |

---

## Default Credentials
- **Username:** admin
- **Initial Password:** admin (forced change on first login)
- Password requirements: 8+ characters, 1 uppercase, 1 number

---

## Status Options
Processing, In Stock, Donated, Sold, Pending Review, Pending Delivery

---

## Prioritized Backlog

### P0 (Critical - done)
- [x] Auth + first-login password reset
- [x] Dashboard with inventory table
- [x] Full intake form (exact original HTML)
- [x] Print view with QR code
- [x] CSV export

### P1 (High Priority - next)
- [ ] Multi-user account management (add/remove users from admin panel)
- [ ] Search by additional fields (Manufacturer, Date Imaged)
- [ ] Pagination for large inventories (currently loads all 1000)
- [ ] Backend password strength validation (currently only frontend)

### P2 (Nice to Have)
- [ ] Bulk status update
- [ ] Inventory statistics/reporting charts
- [ ] Email notifications on donation completion
- [ ] Barcode scanner input for Serial No. field
- [ ] Dark mode

---

## Environment Variables

### Backend (`/app/backend/.env`)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
JWT_SECRET_KEY=c4k-inventory-2025-prod-secret-key-change-me
```

### Frontend (`/app/frontend/.env`)
```
REACT_APP_BACKEND_URL=https://c4k-intake-system.preview.emergentagent.com
WDS_SOCKET_PORT=443
```
