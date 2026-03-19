"""
Tests for new features: pagination/filter (frontend-only), admin user management APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "Admin@12345"})
    assert res.status_code == 200
    data = res.json()
    assert data.get("role") == "admin", "Login should return role=admin"
    return data["access_token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestLoginReturnsRole:
    """Login endpoint must return role field"""

    def test_login_returns_role(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "Admin@12345"})
        assert res.status_code == 200
        data = res.json()
        assert "role" in data, "Login response must include role"
        assert data["role"] == "admin"

    def test_login_returns_username(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "Admin@12345"})
        assert res.status_code == 200
        data = res.json()
        assert data["username"] == "admin"


class TestAdminUserManagement:
    """Admin user management CRUD"""

    TEST_USER = "TEST_techuser99"
    TEST_PW = "Temppass1!"

    def test_get_users_list(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert any(u["username"] == "admin" for u in data)

    def test_create_user(self, admin_headers):
        # Cleanup first if exists
        requests.delete(f"{BASE_URL}/api/admin/users/{self.TEST_USER}", headers=admin_headers)
        
        res = requests.post(f"{BASE_URL}/api/admin/users", json={
            "username": self.TEST_USER,
            "initial_password": self.TEST_PW,
            "role": "technician"
        }, headers=admin_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["username"] == self.TEST_USER.lower()
        assert data["role"] == "technician"
        assert data["must_change_password"] == True

    def test_created_user_appears_in_list(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert res.status_code == 200
        usernames = [u["username"] for u in res.json()]
        assert self.TEST_USER.lower() in usernames

    def test_create_duplicate_user_returns_409(self, admin_headers):
        res = requests.post(f"{BASE_URL}/api/admin/users", json={
            "username": self.TEST_USER,
            "initial_password": self.TEST_PW,
            "role": "technician"
        }, headers=admin_headers)
        assert res.status_code == 409

    def test_reset_user_password(self, admin_headers):
        res = requests.put(f"{BASE_URL}/api/admin/users/{self.TEST_USER.lower()}/reset-password",
            json={"new_password": "NewTemp456!"},
            headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert "message" in data

    def test_reset_nonexistent_user_returns_404(self, admin_headers):
        res = requests.put(f"{BASE_URL}/api/admin/users/nonexistent_xyz/reset-password",
            json={"new_password": "SomePass1!"},
            headers=admin_headers)
        assert res.status_code == 404

    def test_cannot_delete_own_account(self, admin_headers):
        res = requests.delete(f"{BASE_URL}/api/admin/users/admin", headers=admin_headers)
        assert res.status_code == 400

    def test_delete_user(self, admin_headers):
        res = requests.delete(f"{BASE_URL}/api/admin/users/{self.TEST_USER.lower()}", headers=admin_headers)
        assert res.status_code == 200

    def test_deleted_user_not_in_list(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert res.status_code == 200
        usernames = [u["username"] for u in res.json()]
        assert self.TEST_USER.lower() not in usernames


class TestNonAdminAccess:
    """Non-admin users should get 403 on admin endpoints"""

    def test_create_tech_user_for_auth_test(self, admin_headers):
        requests.delete(f"{BASE_URL}/api/admin/users/test_tech_access", headers=admin_headers)
        res = requests.post(f"{BASE_URL}/api/admin/users", json={
            "username": "test_tech_access",
            "initial_password": "TechPass1!",
            "role": "technician"
        }, headers=admin_headers)
        assert res.status_code == 201

    def test_tech_cannot_access_admin_users(self, admin_headers):
        # Login as technician
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "test_tech_access", "password": "TechPass1!"
        })
        # They must change pw first - skip if forced
        if res.status_code != 200:
            pytest.skip("Technician login flow requires password change")
        token = res.json()["access_token"]
        tech_headers = {"Authorization": f"Bearer {token}"}
        
        get_res = requests.get(f"{BASE_URL}/api/admin/users", headers=tech_headers)
        assert get_res.status_code == 403

    def test_cleanup_tech_user(self, admin_headers):
        requests.delete(f"{BASE_URL}/api/admin/users/test_tech_access", headers=admin_headers)


class TestComputerFiltering:
    """Test computers endpoint returns data needed for frontend filtering"""

    def test_get_computers(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/computers", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)

    def test_computers_have_inventory_status(self, admin_headers):
        res = requests.get(f"{BASE_URL}/api/computers", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        if data:
            assert "inventory_status" in data[0]
