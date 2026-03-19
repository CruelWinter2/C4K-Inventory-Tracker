"""
Iteration 5 Backend Tests:
- RBAC: Technician cannot access /api/admin/users
- Admin can access /api/admin/users
- /api/export/csv still works (backend endpoint, though frontend now does client-side export)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "Admin@12345"})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def tech_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "testtech_final", "password": "Tech@12345"})
    assert resp.status_code == 200, f"Tech login failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def tech_headers(tech_token):
    return {"Authorization": f"Bearer {tech_token}"}


class TestAdminUserManagement:
    """RBAC tests: admin can access /api/admin/users, technician cannot"""

    def test_admin_can_list_users(self, admin_headers):
        """Admin GET /api/admin/users returns 200"""
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        users = resp.json()
        assert isinstance(users, list), "Response must be a list"
        usernames = [u["username"] for u in users]
        assert "admin" in usernames, "admin user must exist in list"
        print(f"✅ Admin can list users. Found {len(users)} users: {usernames}")

    def test_admin_user_list_has_required_fields(self, admin_headers):
        """Each user object has id, username, role, must_change_password"""
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        users = resp.json()
        for u in users:
            assert "id" in u, f"Missing 'id' in {u}"
            assert "username" in u, f"Missing 'username' in {u}"
            assert "role" in u, f"Missing 'role' in {u}"
            assert "must_change_password" in u, f"Missing 'must_change_password' in {u}"
        print(f"✅ All user objects have required fields")

    def test_technician_cannot_list_users(self, tech_headers):
        """Technician GET /api/admin/users returns 403"""
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=tech_headers)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "detail" in data
        print(f"✅ Technician correctly gets 403 when listing users: {data['detail']}")

    def test_technician_cannot_create_user(self, tech_headers):
        """Technician POST /api/admin/users returns 403"""
        resp = requests.post(
            f"{BASE_URL}/api/admin/users",
            json={"username": "shouldfail_tech", "initial_password": "Test@1234", "role": "technician"},
            headers=tech_headers
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print(f"✅ Technician correctly gets 403 when creating user")

    def test_technician_cannot_delete_user(self, tech_headers):
        """Technician DELETE /api/admin/users/{username} returns 403"""
        resp = requests.delete(f"{BASE_URL}/api/admin/users/admin", headers=tech_headers)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print(f"✅ Technician correctly gets 403 when deleting user")

    def test_technician_cannot_reset_password(self, tech_headers):
        """Technician PUT /api/admin/users/{username}/reset-password returns 403"""
        resp = requests.put(
            f"{BASE_URL}/api/admin/users/admin/reset-password",
            json={"new_password": "NewPass@123"},
            headers=tech_headers
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print(f"✅ Technician correctly gets 403 when resetting passwords")

    def test_unauthenticated_cannot_list_users(self):
        """No token GET /api/admin/users returns 401"""
        resp = requests.get(f"{BASE_URL}/api/admin/users")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print(f"✅ Unauthenticated request correctly gets 401")


class TestCSVExportBackend:
    """Backend CSV export endpoint still works (even though frontend now does client-side)"""

    def test_admin_can_export_csv(self, admin_headers):
        """Admin GET /api/export/csv returns 200 with text/csv"""
        resp = requests.get(f"{BASE_URL}/api/export/csv", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        assert "text/csv" in resp.headers.get("content-type", ""), \
            f"Expected text/csv, got {resp.headers.get('content-type')}"
        assert "c4k_inventory.csv" in resp.headers.get("content-disposition", ""), \
            f"Expected filename in content-disposition"
        print(f"✅ Admin can export CSV from backend. Content-Type: {resp.headers.get('content-type')}")

    def test_csv_has_correct_headers(self, admin_headers):
        """CSV first row has expected column headers"""
        resp = requests.get(f"{BASE_URL}/api/export/csv", headers=admin_headers)
        assert resp.status_code == 200
        lines = resp.text.strip().split('\n')
        assert len(lines) >= 1, "CSV must have at least a header row"
        headers = [h.strip().replace('\r', '') for h in lines[0].split(',')]
        expected_fields = [
            'serial_no', 'inventory_status', 'recipient_name', 'manufacturer',
            'created_at', 'updated_at', 'created_by', 'oig_1_1', 'oig_3_7'
        ]
        for field in expected_fields:
            assert field in headers, f"Missing expected field '{field}' in CSV headers: {headers[:10]}"
        print(f"✅ CSV has correct headers. Total columns: {len(headers)}")

    def test_technician_can_export_csv(self, tech_headers):
        """Technician GET /api/export/csv returns 200 (all authenticated users can export)"""
        resp = requests.get(f"{BASE_URL}/api/export/csv", headers=tech_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print(f"✅ Technician can also export CSV from backend")

    def test_unauthenticated_cannot_export_csv(self):
        """Unauthenticated GET /api/export/csv returns 401"""
        resp = requests.get(f"{BASE_URL}/api/export/csv")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {resp.text}"
        print(f"✅ Unauthenticated request correctly gets 401 on CSV export")


class TestAuthMe:
    """Verify /api/auth/me returns correct role for admin and technician"""

    def test_admin_role(self, admin_headers):
        """GET /api/auth/me returns role=admin for admin user"""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "admin", f"Expected role=admin, got {data.get('role')}"
        assert data["username"] == "admin"
        print(f"✅ Admin user has role=admin")

    def test_technician_role(self, tech_headers):
        """GET /api/auth/me returns role=technician for tech user"""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "technician", f"Expected role=technician, got {data.get('role')}"
        assert data["username"] == "testtech_final"
        print(f"✅ Technician user has role=technician")
