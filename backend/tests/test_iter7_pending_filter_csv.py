"""
Iteration 7 Tests: Pending Only Filter and CSV Export Column Fix
Tests cover:
- Creating/verifying Pending Review and Pending Delivery records
- FILTER_OPTIONS Pending logic (matchesFilter)
- CSV export (backend endpoint - checks 'modal' field; frontend export uses HEADER_LABELS)
- Stats computation for pending records
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_token():
    """Authenticate as admin and return token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "Admin@12345"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ─── Setup: Create test pending records ───────────────────────────────────────

@pytest.fixture(scope="module", autouse=True)
def create_pending_test_records(auth_headers):
    """Create pending records for testing; cleanup after all tests in module."""
    created_serials = []

    # Create 'Pending Review' record
    r1 = requests.post(f"{BASE_URL}/api/computers", headers=auth_headers, json={
        "serial_no": "TEST-PEND-REVIEW-001",
        "manufacturer": "Lenovo",
        "modal": "ThinkPad T480",
        "inventory_status": "Pending Review",
        "date_imaged": "01/15/2025",
    })
    if r1.status_code == 201:
        created_serials.append("TEST-PEND-REVIEW-001")
    elif r1.status_code == 409:
        print("TEST-PEND-REVIEW-001 already exists - ok")
        created_serials.append("TEST-PEND-REVIEW-001")

    # Create 'Pending Delivery' record
    r2 = requests.post(f"{BASE_URL}/api/computers", headers=auth_headers, json={
        "serial_no": "TEST-PEND-DELIVERY-001",
        "manufacturer": "Acer",
        "modal": "Aspire 5",
        "inventory_status": "Pending Delivery",
        "date_imaged": "01/20/2025",
    })
    if r2.status_code == 201:
        created_serials.append("TEST-PEND-DELIVERY-001")
    elif r2.status_code == 409:
        print("TEST-PEND-DELIVERY-001 already exists - ok")
        created_serials.append("TEST-PEND-DELIVERY-001")

    yield created_serials

    # Teardown: delete test pending records
    for serial in created_serials:
        try:
            requests.delete(
                f"{BASE_URL}/api/computers/{requests.utils.quote(serial, safe='')}",
                headers=auth_headers
            )
            print(f"Cleaned up {serial}")
        except Exception as e:
            print(f"Cleanup failed for {serial}: {e}")


# ─── Backend Tests ────────────────────────────────────────────────────────────

class TestPendingRecordCreation:
    """Verify pending status records can be created and retrieved."""

    def test_pending_review_record_exists(self, auth_headers):
        """Verify TEST-PEND-REVIEW-001 exists with correct status."""
        response = requests.get(
            f"{BASE_URL}/api/computers/TEST-PEND-REVIEW-001",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["serial_no"] == "TEST-PEND-REVIEW-001"
        assert data["inventory_status"] == "Pending Review"
        assert data["manufacturer"] == "Lenovo"
        assert data["modal"] == "ThinkPad T480"
        print("✅ Pending Review record found with correct fields")

    def test_pending_delivery_record_exists(self, auth_headers):
        """Verify TEST-PEND-DELIVERY-001 exists with correct status."""
        response = requests.get(
            f"{BASE_URL}/api/computers/TEST-PEND-DELIVERY-001",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["serial_no"] == "TEST-PEND-DELIVERY-001"
        assert data["inventory_status"] == "Pending Delivery"
        assert data["manufacturer"] == "Acer"
        assert data["modal"] == "Aspire 5"
        print("✅ Pending Delivery record found with correct fields")

    def test_list_computers_includes_pending(self, auth_headers):
        """List endpoint returns both pending records."""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        computers = response.json()
        serials = [c["serial_no"] for c in computers]
        assert "TEST-PEND-REVIEW-001" in serials
        assert "TEST-PEND-DELIVERY-001" in serials

        # Check pending counts
        pending_records = [c for c in computers if c["inventory_status"] in ("Pending Review", "Pending Delivery")]
        assert len(pending_records) >= 2
        print(f"✅ Found {len(pending_records)} pending records in list")

    def test_status_patch_to_pending_review(self, auth_headers):
        """PATCH status endpoint accepts 'Pending Review'."""
        # Use existing in-stock record; patch to pending then back
        response = requests.patch(
            f"{BASE_URL}/api/computers/UI-FORM-SAVE-001/status",
            headers=auth_headers,
            json={"status": "Pending Review"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Pending Review"

        # Restore to In Stock
        restore = requests.patch(
            f"{BASE_URL}/api/computers/UI-FORM-SAVE-001/status",
            headers=auth_headers,
            json={"status": "In Stock"}
        )
        assert restore.status_code == 200
        print("✅ PATCH to Pending Review accepted and restored to In Stock")

    def test_status_patch_to_pending_delivery(self, auth_headers):
        """PATCH status endpoint accepts 'Pending Delivery'."""
        response = requests.patch(
            f"{BASE_URL}/api/computers/TEST-BATCH-001/status",
            headers=auth_headers,
            json={"status": "Pending Delivery"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Pending Delivery"

        # Restore to In Stock
        restore = requests.patch(
            f"{BASE_URL}/api/computers/TEST-BATCH-001/status",
            headers=auth_headers,
            json={"status": "In Stock"}
        )
        assert restore.status_code == 200
        print("✅ PATCH to Pending Delivery accepted and restored to In Stock")


class TestBackendCSVExport:
    """Test the backend CSV export endpoint - note: frontend export has HEADER_LABELS fix.
    The backend endpoint still uses 'modal' as header column (not renamed).
    The CSV column fix is in the frontend client-side export.
    """

    def test_csv_export_endpoint_returns_200(self, auth_headers):
        """Backend /api/export/csv returns 200 with CSV content."""
        response = requests.get(f"{BASE_URL}/api/export/csv", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("✅ CSV export endpoint returns 200 with CSV content-type")

    def test_csv_has_manufacturer_column(self, auth_headers):
        """CSV header row contains 'manufacturer' column."""
        response = requests.get(f"{BASE_URL}/api/export/csv", headers=auth_headers)
        assert response.status_code == 200
        lines = response.text.strip().split('\n')
        header = lines[0]
        columns = [col.strip() for col in header.split(',')]
        assert "manufacturer" in columns, f"'manufacturer' not in CSV headers: {header}"
        print(f"✅ 'manufacturer' found in CSV headers at position {columns.index('manufacturer')}")

    def test_csv_has_modal_column_backend(self, auth_headers):
        """Backend CSV header uses 'modal' (unchanged - the rename is frontend-only)."""
        response = requests.get(f"{BASE_URL}/api/export/csv", headers=auth_headers)
        assert response.status_code == 200
        lines = response.text.strip().split('\n')
        header = lines[0]
        columns = [col.strip() for col in header.split(',')]
        # Backend uses 'modal' (not renamed)
        assert "modal" in columns, f"'modal' not in backend CSV headers: {header}"
        print(f"✅ Backend CSV has 'modal' column at position {columns.index('modal')}")

    def test_csv_pending_records_data(self, auth_headers):
        """CSV data rows contain pending records with correct manufacturer and modal values."""
        response = requests.get(f"{BASE_URL}/api/export/csv", headers=auth_headers)
        assert response.status_code == 200
        lines = response.text.strip().split('\n')
        header_cols = [col.strip() for col in lines[0].split(',')]

        manufacturer_idx = header_cols.index("manufacturer")
        modal_idx = header_cols.index("modal")
        status_idx = header_cols.index("inventory_status")
        serial_idx = header_cols.index("serial_no")

        pending_rows = []
        for line in lines[1:]:
            cols = line.split(',')
            if len(cols) > status_idx:
                status = cols[status_idx].strip()
                if "Pending" in status:
                    pending_rows.append({
                        "serial": cols[serial_idx].strip(),
                        "manufacturer": cols[manufacturer_idx].strip(),
                        "modal": cols[modal_idx].strip(),
                        "status": status,
                    })

        assert len(pending_rows) >= 2, f"Expected at least 2 pending rows, got {len(pending_rows)}"

        # Check Lenovo/ThinkPad T480 and Acer/Aspire 5 are present
        serials = [r["serial"] for r in pending_rows]
        assert "TEST-PEND-REVIEW-001" in serials, f"TEST-PEND-REVIEW-001 not in pending rows: {serials}"
        assert "TEST-PEND-DELIVERY-001" in serials, f"TEST-PEND-DELIVERY-001 not in pending rows: {serials}"
        print(f"✅ Pending rows found in CSV: {pending_rows}")


class TestFilterLogicVerification:
    """Verify filter logic matches frontend matchesFilter behavior via API data."""

    def test_pending_filter_covers_both_statuses(self, auth_headers):
        """Fetch all computers and verify pending filter covers both 'Pending Review' and 'Pending Delivery'."""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        computers = response.json()

        # Simulate frontend matchesFilter with 'Pending'
        def matches_pending(c):
            return c["inventory_status"] == "Pending Review" or c["inventory_status"] == "Pending Delivery"

        pending_filtered = [c for c in computers if matches_pending(c)]
        non_pending = [c for c in computers if not matches_pending(c)]

        # Verify our test records are in pending
        pending_serials = [c["serial_no"] for c in pending_filtered]
        assert "TEST-PEND-REVIEW-001" in pending_serials
        assert "TEST-PEND-DELIVERY-001" in pending_serials

        # Verify 'In Stock' records are NOT in pending
        in_stock_records = [c for c in computers if c["inventory_status"] == "In Stock"]
        in_stock_serials = [c["serial_no"] for c in in_stock_records]
        for serial in in_stock_serials:
            assert serial not in pending_serials, f"{serial} (In Stock) should not appear in pending filter"

        print(f"✅ Pending filter: {len(pending_filtered)} pending, {len(non_pending)} non-pending")
        print(f"   Pending serials: {pending_serials}")

    def test_in_stock_filter_excludes_pending(self, auth_headers):
        """Verify 'In Stock' filter excludes pending records."""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        computers = response.json()

        in_stock_filtered = [c for c in computers if c["inventory_status"] == "In Stock"]
        serials = [c["serial_no"] for c in in_stock_filtered]
        assert "TEST-PEND-REVIEW-001" not in serials
        assert "TEST-PEND-DELIVERY-001" not in serials
        print(f"✅ In Stock filter excludes pending records. In Stock: {serials}")
