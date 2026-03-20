/**
 * API Configuration Utility
 * 
 * Centralizes the API base URL configuration and provides helpful error messages
 * if the environment variable is not properly configured.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Log a warning if BACKEND_URL is not configured (helps debugging Docker builds)
if (!BACKEND_URL) {
  console.error(
    '%c[C4K ERROR] REACT_APP_BACKEND_URL is not defined!',
    'color: red; font-weight: bold; font-size: 14px;'
  );
  console.error(
    '%c[C4K] This usually means:\n' +
    '  1. You ran "docker compose build" before running "setup.sh"\n' +
    '  2. The .env file is missing or incorrectly configured\n' +
    '  3. (Local dev) frontend/.env or frontend/.env.local is missing REACT_APP_BACKEND_URL',
    'color: orange;'
  );
}

/**
 * The base API URL for all backend calls.
 * Example: "https://c4k.example.com/api" or "http://localhost/api"
 */
export const API_BASE = `${BACKEND_URL || ''}/api`;

/**
 * Helper to check if the API is properly configured
 */
export const isApiConfigured = () => Boolean(BACKEND_URL);

export default API_BASE;
