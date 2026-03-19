"""
Iteration 8 Tests: Edit Functionality Polish + First-Time Setup Endpoints
Tests cover:
- PUT /api/computers/{serial_no}: update record, preserves created_at/created_by
- PUT /api/computers/{serial_no}: 403 when technician tries Donated/Sold
- GET /api/setup/status: returns {setup_required: false} when users exist
- POST /api/setup/init: returns 403 when users already exist
- Edit form test records: TEST-BATCH-001 and UI-FORM-SAVE-001 exist
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


@pytest.fixture(scope="module")
def technician_token(auth_headers):
    """Create a technician user for RBAC testing; return token."""
    # Create technician user (may already exist - 409 is ok)
    requests.post(f"{BASE_URL}/api/admin/users", headers=auth_headers, json={
        "username": "test_tech_iter8",
        "initial_password": "TechPass@1",
        "role": "technician"
    })
    # Log in as technician
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "test_tech_iter8",
        "password": "TechPass@1"
    })
    if response.status_code != 200:
        pytest.skip("Technician login failed; must_change_password may be set")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def tech_headers(technician_token):
    return {"Authorization": f"Bearer {technician_token}"}


@pytest.fixture(scope="module", autouse=True)
def ensure_test_record(auth_headers):
    """Ensure TEST-EDIT-ITER8-001 exists for PUT tests; clean up after."""
    serial = "TEST-EDIT-ITER8-001"
    r = requests.post(f"{BASE_URL}/api/computers", headers=auth_headers, json={
        "serial_no": serial,
        "manufacturer": "HP",
        "modal": "ProBook 450",
        "recipient_name": "Original Recipient",
        "inventory_status": "In Stock",
    })
    # Accept 201 (created) or 409 (already exists from previous run)
    if r.status_code not in (201, 409):
        pytest.fail(f"Could not create test record: {r.status_code} {r.text}")

    yield

    # Cleanup
    requests.delete(f"{BASE_URL}/api/computers/{serial}", headers=auth_headers)


# ─── Setup Endpoint Tests ─────────────────────────────────────────────────────

class TestSetupEndpoints:
    """Tests for GET /api/setup/status and POST /api/setup/init"""

    def test_setup_status_returns_false_when_users_exist(self):
        """GET /api/setup/status should return setup_required=false when users exist."""
        response = requests.get(f"{BASE_URL}/api/setup/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "setup_required" in data, "Response missing 'setup_required' key"
        assert data["setup_required"] is False, f"Expected setup_required=false but got {data['setup_required']}"

    def test_setup_status_no_auth_required(self):
        """GET /api/setup/status must not require authentication."""
        # No Authorization header
        response = requests.get(f"{BASE_URL}/api/setup/status")
        assert response.status_code == 200, f"Setup status should be public endpoint, got {response.status_code}"

    def test_setup_init_returns_403_when_users_exist(self):
        """POST /api/setup/init should return 403 when users already exist."""
        response = requests.post(f"{BASE_URL}/api/setup/init", json={
            "username": "testadmin",
            "password": "TestAdmin@1",
            "confirm_password": "TestAdmin@1"
        })
        assert response.status_code == 403, f"Expected 403 (setup already done), got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data, "Response missing 'detail' key"
        assert "Setup already completed" in data["detail"] or "log in" in data["detail"].lower(), \
            f"Unexpected detail message: {data['detail']}"

    def test_setup_init_no_auth_required(self):
        """POST /api/setup/init must be a public endpoint (no auth required)."""
        # Should return 403 (users exist) not 401 (unauthenticated)
        response = requests.post(f"{BASE_URL}/api/setup/init", json={
            "username": "testadmin",
            "password": "TestAdmin@1",
            "confirm_password": "TestAdmin@1"
        })
        assert response.status_code != 401, \
            "setup/init should not require authentication but returned 401"


# ─── PUT /api/computers/{serial_no} Tests ────────────────────────────────────

class TestEditComputer:
    """Tests for PUT /api/computers/{serial_no}"""

    def test_put_updates_record_and_returns_200(self, auth_headers):
        """PUT should return 200 with updated record."""
        serial = "TEST-EDIT-ITER8-001"
        response = requests.put(
            f"{BASE_URL}/api/computers/{serial}",
            headers=auth_headers,
            json={
                "serial_no": serial,
                "manufacturer": "HP",
                "modal": "ProBook 450 G8",          # updated
                "recipient_name": "Updated Recipient",   # updated
                "inventory_status": "In Stock",
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["modal"] == "ProBook 450 G8", f"modal not updated: {data.get('modal')}"
        assert data["recipient_name"] == "Updated Recipient", \
            f"recipient_name not updated: {data.get('recipient_name')}"

    def test_put_preserves_created_at_and_created_by(self, auth_headers):
        """PUT should not overwrite created_at or created_by from original."""
        serial = "TEST-EDIT-ITER8-001"

        # Get original record to capture created_at / created_by
        original = requests.get(
            f"{BASE_URL}/api/computers/{serial}", headers=auth_headers
        )
        assert original.status_code == 200
        orig_data = original.json()
        original_created_at = orig_data.get("created_at")
        original_created_by = orig_data.get("created_by")
        assert original_created_at, "Original record missing created_at"

        # Perform PUT
        response = requests.put(
            f"{BASE_URL}/api/computers/{serial}",
            headers=auth_headers,
            json={
                "serial_no": serial,
                "manufacturer": "HP",
                "modal": "ProBook 450 G9",
                "recipient_name": "Updated Again",
                "inventory_status": "In Stock",
            }
        )
        assert response.status_code == 200, f"PUT failed: {response.status_code} {response.text}"
        updated = response.json()

        # created_at must be preserved
        assert updated.get("created_at") == original_created_at, \
            f"created_at changed! Original: {original_created_at}, After PUT: {updated.get('created_at')}"

        # created_by must be preserved
        if original_created_by:
            assert updated.get("created_by") == original_created_by, \
                f"created_by changed! Original: {original_created_by}, After PUT: {updated.get('created_by')}"

        # updated_at should be set (different from created_at or a new value)
        assert updated.get("updated_at"), "updated_at missing after PUT"

        # updated_by should be set
        assert updated.get("updated_by"), "updated_by missing after PUT"

    def test_put_returns_404_for_nonexistent_record(self, auth_headers):
        """PUT on non-existent serial_no should return 404."""
        response = requests.put(
            f"{BASE_URL}/api/computers/DOES-NOT-EXIST-9999",
            headers=auth_headers,
            json={
                "serial_no": "DOES-NOT-EXIST-9999",
                "inventory_status": "In Stock",
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_put_technician_cannot_set_donated(self, tech_headers):
        """Technician PUT with status=Donated should return 403."""
        serial = "TEST-EDIT-ITER8-001"
        response = requests.put(
            f"{BASE_URL}/api/computers/{serial}",
            headers=tech_headers,
            json={
                "serial_no": serial,
                "manufacturer": "HP",
                "modal": "ProBook 450",
                "inventory_status": "Donated",  # restricted for technician
            }
        )
        assert response.status_code == 403, \
            f"Expected 403 for technician setting Donated, got {response.status_code}: {response.text}"

    def test_put_technician_cannot_set_sold(self, tech_headers):
        """Technician PUT with status=Sold should return 403."""
        serial = "TEST-EDIT-ITER8-001"
        response = requests.put(
            f"{BASE_URL}/api/computers/{serial}",
            headers=tech_headers,
            json={
                "serial_no": serial,
                "manufacturer": "HP",
                "modal": "ProBook 450",
                "inventory_status": "Sold",  # restricted for technician
            }
        )
        assert response.status_code == 403, \
            f"Expected 403 for technician setting Sold, got {response.status_code}: {response.text}"

    def test_put_technician_can_set_in_stock(self, tech_headers):
        """Technician should be able to PUT with non-restricted status."""
        serial = "TEST-EDIT-ITER8-001"
        response = requests.put(
            f"{BASE_URL}/api/computers/{serial}",
            headers=tech_headers,
            json={
                "serial_no": serial,
                "manufacturer": "HP",
                "modal": "ProBook 450",
                "inventory_status": "In Stock",  # allowed for technician
            }
        )
        assert response.status_code == 200, \
            f"Expected 200 for technician setting In Stock, got {response.status_code}: {response.text}"

    def test_put_verify_existing_records_accessible(self, auth_headers):
        """Verify that TEST-BATCH-001 and UI-FORM-SAVE-001 exist and are editable."""
        for serial in ["TEST-BATCH-001", "UI-FORM-SAVE-001"]:
            response = requests.get(f"{BASE_URL}/api/computers/{serial}", headers=auth_headers)
            assert response.status_code == 200, \
                f"Record {serial} not found (status {response.status_code}). Required for edit testing."
            data = response.json()
            assert data["serial_no"] == serial, f"serial_no mismatch in response"

    def test_put_returns_full_record_structure(self, auth_headers):
        """PUT response should contain all expected fields."""
        serial = "TEST-EDIT-ITER8-001"
        response = requests.put(
            f"{BASE_URL}/api/computers/{serial}",
            headers=auth_headers,
            json={
                "serial_no": serial,
                "manufacturer": "HP",
                "modal": "ProBook 450",
                "recipient_name": "Final Recipient",
                "inventory_status": "In Stock",
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Check key fields in response
        for field in ["id", "serial_no", "manufacturer", "modal", "inventory_status",
                      "created_at", "updated_at"]:
            assert field in data, f"Missing field '{field}' in PUT response"
