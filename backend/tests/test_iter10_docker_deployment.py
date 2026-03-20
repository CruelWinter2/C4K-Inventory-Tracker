"""
Iteration 10: Docker Deployment Stack Testing

Focus areas:
1. Environment Variables (REACT_APP_BACKEND_URL properly configured)
2. Nginx routing (/api/ prefix handling)
3. Setup route accessibility without auth
4. Full CRUD operations for inventory
5. Login flow verification
"""

import pytest
import requests
import os
import time

# Use the production URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin@12345"


class TestHealthAndSetupEndpoints:
    """Test endpoints that should work without authentication"""

    def test_health_endpoint_returns_ok(self):
        """Health endpoint should return status ok"""
        response = requests.get(f"{API_BASE}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "c4k-inventory-backend"
        print(f"✅ Health endpoint: {data}")

    def test_setup_status_without_auth(self):
        """Setup status should be accessible without authentication"""
        response = requests.get(f"{API_BASE}/setup/status")
        assert response.status_code == 200
        data = response.json()
        assert "setup_required" in data
        # Since admin exists, setup_required should be False
        assert data["setup_required"] == False
        print(f"✅ Setup status (no auth required): {data}")

    def test_api_prefix_routing_works(self):
        """Verify /api prefix routing works correctly through nginx"""
        # Multiple endpoints should be accessible via /api prefix
        endpoints = ["/health", "/setup/status"]
        for endpoint in endpoints:
            response = requests.get(f"{API_BASE}{endpoint}")
            assert response.status_code == 200, f"Failed for {endpoint}: {response.status_code}"
        print("✅ API prefix routing works for all public endpoints")


class TestAuthenticationFlow:
    """Test authentication endpoints"""

    def test_login_with_valid_credentials(self):
        """Login should return access token for valid credentials"""
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["username"] == ADMIN_USERNAME
        assert data["role"] == "admin"
        print(f"✅ Login successful: username={data['username']}, role={data['role']}")

    def test_login_with_invalid_credentials(self):
        """Login should return 401 for invalid credentials"""
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": "wronguser", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✅ Invalid credentials returns 401 as expected")

    def test_me_endpoint_requires_auth(self):
        """/auth/me should require authentication"""
        response = requests.get(f"{API_BASE}/auth/me")
        assert response.status_code in [401, 403]
        print("✅ /auth/me requires authentication")

    def test_me_endpoint_with_valid_token(self):
        """/auth/me should return user info with valid token"""
        # Get token first
        login_response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["access_token"]
        
        # Use token
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == ADMIN_USERNAME
        assert data["role"] == "admin"
        print(f"✅ /auth/me with valid token: {data}")


class TestInventoryCRUD:
    """Test CRUD operations for inventory items"""

    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_list_computers_requires_auth(self):
        """GET /computers should require authentication"""
        response = requests.get(f"{API_BASE}/computers")
        assert response.status_code in [401, 403]
        print("✅ /computers requires authentication")

    def test_list_computers_with_auth(self, auth_headers):
        """GET /computers should return list with valid auth"""
        response = requests.get(f"{API_BASE}/computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Listed {len(data)} computers")

    def test_create_computer(self, auth_headers):
        """POST /computers should create new inventory item"""
        serial_no = f"TEST-ITER10-{int(time.time())}"
        payload = {
            "serial_no": serial_no,
            "recipient_name": "Test Recipient Iter10",
            "manufacturer": "Dell",
            "modal": "Latitude 5510",
            "inventory_status": "Processing",
            "os_win10": True,
            "ram": "8GB",
            "storage_ssd": True,
            "storage_size": "256GB"
        }
        response = requests.post(f"{API_BASE}/computers", headers=auth_headers, json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["serial_no"] == serial_no
        assert data["manufacturer"] == "Dell"
        print(f"✅ Created computer: {serial_no}")
        return serial_no

    def test_get_computer_by_serial(self, auth_headers):
        """GET /computers/{serial_no} should return computer details"""
        # First create a computer
        serial_no = f"TEST-GET-{int(time.time())}"
        create_payload = {
            "serial_no": serial_no,
            "manufacturer": "HP",
            "modal": "EliteBook 840",
            "inventory_status": "In Stock"
        }
        create_response = requests.post(f"{API_BASE}/computers", headers=auth_headers, json=create_payload)
        assert create_response.status_code == 201

        # Now get it
        response = requests.get(f"{API_BASE}/computers/{serial_no}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["serial_no"] == serial_no
        assert data["manufacturer"] == "HP"
        print(f"✅ Retrieved computer: {serial_no}")

        # Cleanup
        requests.delete(f"{API_BASE}/computers/{serial_no}", headers=auth_headers)

    def test_update_computer(self, auth_headers):
        """PUT /computers/{serial_no} should update computer"""
        # Create
        serial_no = f"TEST-UPDATE-{int(time.time())}"
        create_payload = {
            "serial_no": serial_no,
            "manufacturer": "Lenovo",
            "modal": "ThinkPad T480",
            "inventory_status": "Processing"
        }
        requests.post(f"{API_BASE}/computers", headers=auth_headers, json=create_payload)

        # Update
        update_payload = {
            "serial_no": serial_no,
            "manufacturer": "Lenovo",
            "modal": "ThinkPad T490",
            "inventory_status": "In Stock",
            "ram": "16GB"
        }
        response = requests.put(f"{API_BASE}/computers/{serial_no}", headers=auth_headers, json=update_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["modal"] == "ThinkPad T490"
        assert data["inventory_status"] == "In Stock"
        print(f"✅ Updated computer: {serial_no}")

        # Verify with GET
        get_response = requests.get(f"{API_BASE}/computers/{serial_no}", headers=auth_headers)
        assert get_response.json()["modal"] == "ThinkPad T490"
        print(f"✅ Update verified via GET")

        # Cleanup
        requests.delete(f"{API_BASE}/computers/{serial_no}", headers=auth_headers)

    def test_update_status(self, auth_headers):
        """PATCH /computers/{serial_no}/status should update status"""
        # Create
        serial_no = f"TEST-STATUS-{int(time.time())}"
        create_payload = {
            "serial_no": serial_no,
            "manufacturer": "Dell",
            "inventory_status": "Processing"
        }
        requests.post(f"{API_BASE}/computers", headers=auth_headers, json=create_payload)

        # Update status
        response = requests.patch(
            f"{API_BASE}/computers/{serial_no}/status",
            headers=auth_headers,
            json={"status": "In Stock"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "In Stock"
        print(f"✅ Status updated: {serial_no} -> In Stock")

        # Cleanup
        requests.delete(f"{API_BASE}/computers/{serial_no}", headers=auth_headers)

    def test_delete_computer(self, auth_headers):
        """DELETE /computers/{serial_no} should delete computer"""
        # Create
        serial_no = f"TEST-DELETE-{int(time.time())}"
        create_payload = {"serial_no": serial_no, "manufacturer": "HP"}
        requests.post(f"{API_BASE}/computers", headers=auth_headers, json=create_payload)

        # Delete
        response = requests.delete(f"{API_BASE}/computers/{serial_no}", headers=auth_headers)
        assert response.status_code == 200
        print(f"✅ Deleted computer: {serial_no}")

        # Verify deletion
        get_response = requests.get(f"{API_BASE}/computers/{serial_no}", headers=auth_headers)
        assert get_response.status_code == 404
        print(f"✅ Deletion verified: 404 returned for deleted item")


class TestCSVExport:
    """Test CSV export functionality"""

    @pytest.fixture
    def auth_headers(self):
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_csv_export_requires_auth(self):
        """CSV export should require authentication"""
        response = requests.get(f"{API_BASE}/export/csv")
        assert response.status_code in [401, 403]
        print("✅ CSV export requires authentication")

    def test_csv_export_with_auth(self, auth_headers):
        """CSV export should return CSV data"""
        response = requests.get(f"{API_BASE}/export/csv", headers=auth_headers)
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("Content-Type", "")
        # Check CSV has headers
        content = response.text
        assert "serial_no" in content
        assert "inventory_status" in content
        print("✅ CSV export returns valid CSV data")


class TestAdminUserManagement:
    """Test admin user management endpoints"""

    @pytest.fixture
    def auth_headers(self):
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_list_users_requires_admin(self, auth_headers):
        """GET /admin/users should require admin role"""
        response = requests.get(f"{API_BASE}/admin/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should include the admin user
        admin_user = next((u for u in data if u["username"] == "admin"), None)
        assert admin_user is not None
        assert admin_user["role"] == "admin"
        print(f"✅ Listed {len(data)} users, admin found")


class TestAPIURLConfiguration:
    """Test that API URLs are properly configured (no 'undefined')"""

    def test_base_url_not_undefined(self):
        """BASE_URL should not be undefined or empty"""
        assert BASE_URL, "BASE_URL should not be empty"
        assert "undefined" not in BASE_URL.lower()
        assert "localhost" not in BASE_URL  # Should use production URL
        print(f"✅ BASE_URL is properly configured: {BASE_URL}")

    def test_api_base_properly_formed(self):
        """API_BASE should be properly formed with /api suffix"""
        assert API_BASE.endswith("/api")
        assert "undefined" not in API_BASE.lower()
        print(f"✅ API_BASE is properly formed: {API_BASE}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
