"""
Iteration 6 Backend Tests:
1. Expanded Search - verifies GET /api/computers returns manufacturer and modal fields
2. Batch Printing - verifies records have required fields for print
3. Regression - existing CRUD endpoints still working
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "admin",
        "password": "Admin@12345"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} {response.text}")

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Authenticated headers"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestHealthCheck:
    """Basic health check"""

    def test_api_health(self):
        """API is reachable"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200


class TestExpandedSearchFields:
    """Verify manufacturer and modal fields are returned in computer records"""

    def test_computers_list_returns_manufacturer_field(self, auth_headers):
        """GET /api/computers returns records with manufacturer field"""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Each record should have manufacturer key (even if empty string)
        for rec in data[:5]:
            assert 'manufacturer' in rec, f"Record missing 'manufacturer' field: {rec.get('serial_no')}"

    def test_computers_list_returns_modal_field(self, auth_headers):
        """GET /api/computers returns records with modal field"""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for rec in data[:5]:
            assert 'modal' in rec, f"Record missing 'modal' field: {rec.get('serial_no')}"

    def test_existing_record_has_manufacturer_and_modal(self, auth_headers):
        """The UI-FORM-SAVE-001 record was updated with Dell/Latitude 5490"""
        response = requests.get(f"{BASE_URL}/api/computers/UI-FORM-SAVE-001", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get('manufacturer') == 'Dell', f"Expected manufacturer='Dell', got {data.get('manufacturer')!r}"
        assert data.get('modal') == 'Latitude 5490', f"Expected modal='Latitude 5490', got {data.get('modal')!r}"

    def test_search_record_test_batch_exists(self, auth_headers):
        """TEST-BATCH-001 exists with manufacturer HP for search testing"""
        response = requests.get(f"{BASE_URL}/api/computers/TEST-BATCH-001", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get('manufacturer') == 'HP', f"Expected HP, got {data.get('manufacturer')!r}"
        assert data.get('modal') == 'EliteBook 840', f"Expected 'EliteBook 840', got {data.get('modal')!r}"


class TestBatchPrintPrerequisites:
    """Verify the data structure needed for batch print"""

    def test_all_records_have_serial_no_for_print_route(self, auth_headers):
        """All records have serial_no which is needed for data-testid=batch-record-{serial_no}"""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for rec in data:
            assert rec.get('serial_no'), f"Record missing serial_no: {rec}"

    def test_multiple_records_exist_for_batch_print(self, auth_headers):
        """At least 2 records exist for batch print testing"""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2, f"Need at least 2 records for batch print test, got {len(data)}"

    def test_records_have_required_print_fields(self, auth_headers):
        """Records have the fields needed to render RecordSheet"""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        required_fields = ['serial_no', 'recipient_name', 'inventory_status', 'manufacturer', 'modal']
        for rec in data[:2]:
            for field in required_fields:
                assert field in rec, f"Record {rec.get('serial_no')} missing field '{field}'"


class TestCRUDRegression:
    """Regression: existing CRUD endpoints still work"""

    def test_get_computers_list(self, auth_headers):
        """GET /api/computers returns 200"""
        response = requests.get(f"{BASE_URL}/api/computers", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_single_computer(self, auth_headers):
        """GET /api/computers/:serial returns 200"""
        response = requests.get(f"{BASE_URL}/api/computers/UI-FORM-SAVE-001", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data['serial_no'] == 'UI-FORM-SAVE-001'

    def test_status_patch_endpoint_works(self, auth_headers):
        """PATCH /api/computers/:serial/status returns 200"""
        response = requests.patch(
            f"{BASE_URL}/api/computers/UI-FORM-SAVE-001/status",
            json={"status": "In Stock"},
            headers=auth_headers
        )
        assert response.status_code == 200

    def test_create_and_delete_computer(self, auth_headers):
        """POST then DELETE computer works"""
        # Clean up if exists from prior run
        requests.delete(f"{BASE_URL}/api/computers/TEST-ITER6-DELETE", headers=auth_headers)

        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/computers",
            json={"serial_no": "TEST-ITER6-DELETE", "inventory_status": "In Stock"},
            headers=auth_headers
        )
        assert create_response.status_code in [200, 201]
        assert create_response.json().get('serial_no') == 'TEST-ITER6-DELETE'

        # Delete
        del_response = requests.delete(
            f"{BASE_URL}/api/computers/TEST-ITER6-DELETE",
            headers=auth_headers
        )
        assert del_response.status_code == 200

        # Verify gone
        get_response = requests.get(f"{BASE_URL}/api/computers/TEST-ITER6-DELETE", headers=auth_headers)
        assert get_response.status_code == 404
