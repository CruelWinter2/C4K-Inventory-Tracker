"""C4K Inventory System API Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Store token globally for test ordering
_token = None
_new_password = "Admin@12345"
_test_serial = "TEST_SN_001"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestAuth:
    """Auth endpoint tests"""

    def test_login_invalid(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login", json={"username": "bad", "password": "bad"})
        assert r.status_code == 401

    def test_login_admin(self, client):
        global _token
        r = client.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin"})
        # May be 200 with must_change_password, or 401 if already changed
        if r.status_code == 200:
            data = r.json()
            _token = data["access_token"]
            assert "access_token" in data
            assert "must_change_password" in data
            print(f"Login OK, must_change_password={data['must_change_password']}")
        else:
            # Try new password
            r2 = client.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": _new_password})
            assert r2.status_code == 200
            _token = r2.json()["access_token"]
            print("Login with new password OK")

    def test_change_password(self, client):
        global _token
        if not _token:
            pytest.skip("No token available")
        headers = {"Authorization": f"Bearer {_token}"}
        r = client.post(f"{BASE_URL}/api/auth/change-password",
                        json={"new_password": _new_password, "confirm_password": _new_password},
                        headers=headers)
        # 200 if changed, possibly 400 if already done
        assert r.status_code in [200, 400]
        print(f"Change password: {r.status_code} {r.json()}")

    def test_change_password_mismatch(self, client):
        if not _token:
            pytest.skip("No token available")
        headers = {"Authorization": f"Bearer {_token}"}
        r = client.post(f"{BASE_URL}/api/auth/change-password",
                        json={"new_password": "Abc@12345", "confirm_password": "Different1"},
                        headers=headers)
        assert r.status_code == 400

    def test_get_me(self, client):
        if not _token:
            pytest.skip("No token available")
        headers = {"Authorization": f"Bearer {_token}"}
        r = client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["username"] == "admin"

    def test_get_me_no_auth(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401


class TestComputers:
    """Computer CRUD tests"""

    @pytest.fixture(autouse=True)
    def ensure_token(self, client):
        global _token
        if not _token:
            r = client.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": _new_password})
            if r.status_code == 200:
                _token = r.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {_token}"}

    def test_list_computers(self, client):
        r = client.get(f"{BASE_URL}/api/computers", headers=self.headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_computer(self, client):
        # Clean up first
        client.delete(f"{BASE_URL}/api/computers/{_test_serial}", headers=self.headers)
        r = client.post(f"{BASE_URL}/api/computers",
                        json={"serial_no": _test_serial, "recipient_name": "Test User", "manufacturer": "Dell", "inventory_status": "Processing"},
                        headers=self.headers)
        assert r.status_code == 201
        data = r.json()
        assert data["serial_no"] == _test_serial
        assert data["recipient_name"] == "Test User"
        assert "id" in data

    def test_create_duplicate_serial(self, client):
        r = client.post(f"{BASE_URL}/api/computers",
                        json={"serial_no": _test_serial},
                        headers=self.headers)
        assert r.status_code == 409

    def test_get_computer(self, client):
        r = client.get(f"{BASE_URL}/api/computers/{_test_serial}", headers=self.headers)
        assert r.status_code == 200
        assert r.json()["serial_no"] == _test_serial

    def test_update_computer(self, client):
        r = client.put(f"{BASE_URL}/api/computers/{_test_serial}",
                       json={"serial_no": _test_serial, "recipient_name": "Updated User", "manufacturer": "HP"},
                       headers=self.headers)
        assert r.status_code == 200
        assert r.json()["recipient_name"] == "Updated User"

    def test_update_status(self, client):
        r = client.patch(f"{BASE_URL}/api/computers/{_test_serial}/status",
                         json={"status": "In Stock"},
                         headers=self.headers)
        assert r.status_code == 200

    def test_update_status_invalid(self, client):
        r = client.patch(f"{BASE_URL}/api/computers/{_test_serial}/status",
                         json={"status": "BadStatus"},
                         headers=self.headers)
        assert r.status_code == 400

    def test_qr_code(self, client):
        r = client.get(f"{BASE_URL}/api/computers/{_test_serial}/qr", headers=self.headers)
        assert r.status_code == 200
        data = r.json()
        assert "qr_code" in data
        assert data["qr_code"].startswith("data:image/png;base64,")

    def test_export_csv(self, client):
        r = client.get(f"{BASE_URL}/api/export/csv", headers=self.headers)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")

    def test_delete_computer(self, client):
        r = client.delete(f"{BASE_URL}/api/computers/{_test_serial}", headers=self.headers)
        assert r.status_code == 200

    def test_get_deleted_computer(self, client):
        r = client.get(f"{BASE_URL}/api/computers/{_test_serial}", headers=self.headers)
        assert r.status_code == 404
