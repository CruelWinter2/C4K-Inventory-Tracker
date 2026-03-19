"""
Iteration 4 backend tests - testing new features:
1. Technician status restriction (403 for Donated/Sold via PATCH and PUT)
2. Backend allows all other statuses for technician
3. QR code endpoint still exists (backend unchanged)
4. CSV export still works
5. Computer CRUD for test data setup/teardown
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_CREDS = {"username": "admin", "password": "Admin@12345"}
TECH_USERNAME = "testtech_iter4"
TECH_PASSWORD = "TestTech@1234"
TEST_SERIAL = "ITER4-TEST-STATUS-001"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def tech_token(admin_headers):
    """Create a technician user, get token, yield token, then cleanup"""
    # Create technician user
    create_r = requests.post(
        f"{BASE_URL}/api/admin/users",
        json={"username": TECH_USERNAME, "initial_password": TECH_PASSWORD, "role": "technician"},
        headers=admin_headers
    )
    # Allow 201 (created) or 409 (already exists)
    assert create_r.status_code in [201, 409], f"Create tech user failed: {create_r.text}"

    # Change password if needed (must_change_password flag handling)
    login_r = requests.post(f"{BASE_URL}/api/auth/login",
                             json={"username": TECH_USERNAME, "password": TECH_PASSWORD})
    if login_r.status_code != 200:
        pytest.skip(f"Tech login failed: {login_r.text}")
    
    token = login_r.json()["access_token"]

    # If must_change_password, change it first
    if login_r.json().get("must_change_password"):
        change_r = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"new_password": TECH_PASSWORD, "confirm_password": TECH_PASSWORD},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert change_r.status_code == 200, f"Password change failed: {change_r.text}"
        # Re-login after password change
        login_r2 = requests.post(f"{BASE_URL}/api/auth/login",
                                  json={"username": TECH_USERNAME, "password": TECH_PASSWORD})
        assert login_r2.status_code == 200
        token = login_r2.json()["access_token"]

    yield token

    # Cleanup: delete technician user
    requests.delete(f"{BASE_URL}/api/admin/users/{TECH_USERNAME}", headers=admin_headers)


@pytest.fixture(scope="module")
def tech_headers(tech_token):
    return {"Authorization": f"Bearer {tech_token}"}


@pytest.fixture(scope="module")
def test_computer(admin_headers):
    """Create a test computer, yield serial_no, then delete"""
    payload = {
        "serial_no": TEST_SERIAL,
        "recipient_name": "TEST Iter4 User",
        "inventory_status": "Processing",
    }
    r = requests.post(f"{BASE_URL}/api/computers", json=payload, headers=admin_headers)
    # Allow 201 or 409 (already exists from previous test run)
    if r.status_code == 409:
        # Update to Processing status for test
        requests.patch(
            f"{BASE_URL}/api/computers/{TEST_SERIAL}/status",
            json={"status": "Processing"},
            headers=admin_headers
        )
    else:
        assert r.status_code == 201, f"Create computer failed: {r.text}"

    yield TEST_SERIAL

    # Cleanup
    requests.delete(f"{BASE_URL}/api/computers/{TEST_SERIAL}", headers=admin_headers)


# ── Tests: Technician PATCH /status restrictions ─────────────────────────────

class TestTechnicianStatusRestrictions:
    """Test PATCH /api/computers/{serial_no}/status 403 for Donated/Sold"""

    def test_tech_cannot_set_donated_via_patch(self, tech_headers, test_computer):
        """Technician setting Donated should get 403"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Donated"},
            headers=tech_headers
        )
        assert r.status_code == 403, f"Expected 403 but got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data
        assert "admin" in data["detail"].lower() or "403" in str(r.status_code)

    def test_tech_cannot_set_sold_via_patch(self, tech_headers, test_computer):
        """Technician setting Sold should get 403"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Sold"},
            headers=tech_headers
        )
        assert r.status_code == 403, f"Expected 403 but got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data

    def test_tech_can_set_processing_via_patch(self, tech_headers, test_computer):
        """Technician setting Processing should succeed"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Processing"},
            headers=tech_headers
        )
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        assert r.json()["status"] == "Processing"

    def test_tech_can_set_in_stock_via_patch(self, tech_headers, test_computer):
        """Technician setting In Stock should succeed"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "In Stock"},
            headers=tech_headers
        )
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        assert r.json()["status"] == "In Stock"

    def test_tech_can_set_pending_review_via_patch(self, tech_headers, test_computer):
        """Technician setting Pending Review should succeed"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Pending Review"},
            headers=tech_headers
        )
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        assert r.json()["status"] == "Pending Review"

    def test_tech_can_set_pending_delivery_via_patch(self, tech_headers, test_computer):
        """Technician setting Pending Delivery should succeed"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Pending Delivery"},
            headers=tech_headers
        )
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        assert r.json()["status"] == "Pending Delivery"

    def test_admin_can_set_donated(self, admin_headers, test_computer):
        """Admin should be able to set Donated"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Donated"},
            headers=admin_headers
        )
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        assert r.json()["status"] == "Donated"

    def test_admin_can_set_sold(self, admin_headers, test_computer):
        """Admin should be able to set Sold"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Sold"},
            headers=admin_headers
        )
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text}"
        assert r.json()["status"] == "Sold"
        # Reset to Processing for other tests
        requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "Processing"},
            headers=admin_headers
        )


class TestTechnicianPUTRestrictions:
    """Test PUT /api/computers/{serial_no} 403 for Donated/Sold status"""

    def test_tech_cannot_put_with_donated_status(self, tech_headers, test_computer):
        """Technician updating full record with Donated status should get 403"""
        r = requests.get(f"{BASE_URL}/api/computers/{test_computer}", headers=tech_headers)
        assert r.status_code == 200
        data = r.json()
        # Remove id field (not expected in PUT body)
        data.pop("id", None)
        data["inventory_status"] = "Donated"

        put_r = requests.put(
            f"{BASE_URL}/api/computers/{test_computer}",
            json=data,
            headers=tech_headers
        )
        assert put_r.status_code == 403, f"Expected 403 but got {put_r.status_code}: {put_r.text}"

    def test_tech_cannot_put_with_sold_status(self, tech_headers, test_computer):
        """Technician updating full record with Sold status should get 403"""
        r = requests.get(f"{BASE_URL}/api/computers/{test_computer}", headers=tech_headers)
        assert r.status_code == 200
        data = r.json()
        data.pop("id", None)
        data["inventory_status"] = "Sold"

        put_r = requests.put(
            f"{BASE_URL}/api/computers/{test_computer}",
            json=data,
            headers=tech_headers
        )
        assert put_r.status_code == 403, f"Expected 403 but got {put_r.status_code}: {put_r.text}"

    def test_tech_can_put_with_in_stock_status(self, tech_headers, test_computer):
        """Technician updating full record with In Stock status should succeed"""
        r = requests.get(f"{BASE_URL}/api/computers/{test_computer}", headers=tech_headers)
        assert r.status_code == 200
        data = r.json()
        data.pop("id", None)
        data.pop("created_at", None)
        data.pop("updated_at", None)
        data.pop("created_by", None)
        data.pop("updated_by", None)
        data["inventory_status"] = "In Stock"

        put_r = requests.put(
            f"{BASE_URL}/api/computers/{test_computer}",
            json=data,
            headers=tech_headers
        )
        assert put_r.status_code == 200, f"Expected 200 but got {put_r.status_code}: {put_r.text}"


class TestInvalidStatus:
    """Test invalid status returns 400"""

    def test_invalid_status_returns_400(self, admin_headers, test_computer):
        """Invalid status value should return 400"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/{test_computer}/status",
            json={"status": "InvalidStatus"},
            headers=admin_headers
        )
        assert r.status_code == 400, f"Expected 400 but got {r.status_code}: {r.text}"

    def test_nonexistent_serial_returns_404(self, admin_headers):
        """Non-existent serial number should return 404"""
        r = requests.patch(
            f"{BASE_URL}/api/computers/NONEXISTENT-SERIAL-9999/status",
            json={"status": "Processing"},
            headers=admin_headers
        )
        assert r.status_code == 404, f"Expected 404 but got {r.status_code}: {r.text}"


class TestBackendHealthAndComputers:
    """Sanity checks for core endpoints"""

    def test_list_computers_as_admin(self, admin_headers):
        """GET /api/computers should return list"""
        r = requests.get(f"{BASE_URL}/api/computers", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_get_specific_computer(self, admin_headers, test_computer):
        """GET /api/computers/{serial_no} should return the computer"""
        r = requests.get(f"{BASE_URL}/api/computers/{test_computer}", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["serial_no"] == test_computer
        assert "id" in data
        assert "_id" not in data  # MongoDB _id must be excluded

    def test_qr_endpoint_still_exists(self, admin_headers, test_computer):
        """QR endpoint still exists in backend (even though frontend doesn't use it)"""
        r = requests.get(f"{BASE_URL}/api/computers/{test_computer}/qr", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "qr_code" in data
        assert data["qr_code"].startswith("data:image/png;base64,")

    def test_csv_export(self, admin_headers):
        """CSV export should work"""
        r = requests.get(f"{BASE_URL}/api/export/csv", headers=admin_headers)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
