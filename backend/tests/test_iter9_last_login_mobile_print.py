"""
Iteration 9 Backend Tests:
1. index.html: No emergent-main.js, No PostHog, No emergent-badge, title='C4K Inventory System'
2. Last Login: POST /api/auth/login updates last_login; GET /api/admin/users returns last_login field
3. Print CSS: No broken 'body > *:not(.c4k-print-root)' rule; oig has page-break-inside:avoid; aside hidden
4. No hardcoded localhost in frontend source files
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestIndexHtml:
    """Test index.html has no telemetry scripts and correct title"""

    def test_index_no_emergent_main_js(self):
        """index.html must NOT contain emergent-main.js script tag"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert 'emergent-main.js' not in resp.text, "emergent-main.js script found in index.html - should be removed"

    def test_index_no_posthog(self):
        """index.html must NOT contain PostHog analytics script"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert 'posthog' not in resp.text.lower(), "PostHog analytics script found in index.html - should be removed"

    def test_index_no_emergent_badge(self):
        """index.html must NOT contain emergent-badge element"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert 'emergent-badge' not in resp.text, "emergent-badge element found in index.html - should be removed"

    def test_index_title_c4k(self):
        """index.html title must be 'C4K Inventory System'"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert 'C4K Inventory System' in resp.text, "Title 'C4K Inventory System' not found in index.html"


class TestLastLogin:
    """Test last_login tracking via login endpoint and admin users endpoint"""

    def test_login_returns_200(self):
        """POST /api/auth/login returns 200 with valid credentials"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin", "password": "Admin@12345"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    def test_admin_users_returns_last_login_field(self):
        """GET /api/admin/users returns last_login field in each user object"""
        # Login first to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin", "password": "Admin@12345"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert users_resp.status_code == 200
        users = users_resp.json()
        assert len(users) > 0, "No users returned from /api/admin/users"

        # All users must have 'last_login' key
        for user in users:
            assert "last_login" in user, f"User {user.get('username')} missing 'last_login' field"

    def test_login_updates_last_login(self):
        """POST /api/auth/login sets last_login; GET /api/admin/users shows non-null last_login for admin"""
        # Login as admin
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin", "password": "Admin@12345"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        # Get admin users
        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert users_resp.status_code == 200
        users = users_resp.json()

        # Find admin user
        admin_user = next((u for u in users if u["username"] == "admin"), None)
        assert admin_user is not None, "Admin user not found in /api/admin/users"
        assert admin_user["last_login"] is not None, "Admin user's last_login is None after login"
        assert admin_user["last_login"] != "", "Admin user's last_login is empty after login"

    def test_admin_users_response_structure(self):
        """GET /api/admin/users returns expected fields: id, username, role, must_change_password, created_at, last_login"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin", "password": "Admin@12345"
        })
        token = login_resp.json()["access_token"]

        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert users_resp.status_code == 200
        users = users_resp.json()
        assert len(users) > 0

        # Check response structure for first user
        first_user = users[0]
        required_fields = ["id", "username", "role", "must_change_password", "created_at", "last_login"]
        for field in required_fields:
            assert field in first_user, f"Missing field '{field}' in user response"


class TestPrintCssFile:
    """Test form.css print media query rules directly"""

    def get_form_css(self):
        """Read form.css from file"""
        css_path = "/app/frontend/src/styles/form.css"
        with open(css_path, "r") as f:
            return f.read()

    def test_no_broken_body_not_rule(self):
        """Print CSS must NOT contain 'body > *:not(.c4k-print-root)' rule"""
        css = self.get_form_css()
        assert 'body > *:not(.c4k-print-root)' not in css, \
            "Broken CSS rule 'body > *:not(.c4k-print-root)' found in form.css print styles"

    def test_oig_has_page_break_inside_avoid(self):
        """Print CSS: .c4k-form-root .oig must have page-break-inside: avoid"""
        css = self.get_form_css()
        # Check inside @media print block
        media_print_match = re.search(r'@media\s+print\s*\{(.+?)(?=\n@media|\Z)', css, re.DOTALL)
        assert media_print_match, "@media print block not found in form.css"
        print_css = media_print_match.group(1)
        assert '.oig' in print_css, ".oig class not found in @media print block"
        assert 'page-break-inside' in print_css, "page-break-inside not found in @media print block"

    def test_aside_hidden_in_print(self):
        """Print CSS: aside must be hidden (display:none) in print styles"""
        css = self.get_form_css()
        media_print_match = re.search(r'@media\s+print\s*\{(.+?)(?=\n@media|\Z)', css, re.DOTALL)
        assert media_print_match, "@media print block not found in form.css"
        print_css = media_print_match.group(1)
        assert 'aside' in print_css, "aside not found in @media print CSS"
        assert 'display: none' in print_css or 'display:none' in print_css, \
            "aside does not have display:none in print CSS"


class TestNoHardcodedLocalhost:
    """Test that no hardcoded localhost/127.0.0.1 in frontend source files"""

    def test_no_localhost_in_frontend_src(self):
        """Frontend source files must not contain hardcoded localhost"""
        import subprocess
        result = subprocess.run(
            ['grep', '-r', 'localhost', '/app/frontend/src/'],
            capture_output=True, text=True
        )
        # Filter out any test files
        matches = [line for line in result.stdout.split('\n') if line and '.test.' not in line]
        assert len(matches) == 0, f"Hardcoded localhost found in frontend: {matches}"

    def test_no_127_in_frontend_src(self):
        """Frontend source files must not contain hardcoded 127.0.0.1"""
        import subprocess
        result = subprocess.run(
            ['grep', '-r', '127.0.0.1', '/app/frontend/src/'],
            capture_output=True, text=True
        )
        matches = [line for line in result.stdout.split('\n') if line and '.test.' not in line]
        assert len(matches) == 0, f"Hardcoded 127.0.0.1 found in frontend: {matches}"
