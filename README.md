# Computers 4 Kids (C4K) Inventory Management System

A custom web application built to manage computer inventory, track recipient data, and generate standardized, printable orientation guidelines for the C4K facility. 

## Tech Stack
* **Frontend:** React.js, Tailwind CSS
* **Backend:** Python
* **Database:** MongoDB
* **Deployment:** Docker & Docker Compose

## Quick Start (Local Development)

This project uses a bash script to handle environment variable generation and Docker orchestration. 

1. Clone this repository to your local machine.
2. Ensure Docker and Docker Compose are installed and running.
3. Make the setup script executable:
   `chmod +x setup.sh`
4. Run the setup script:
   `./setup.sh`
5. Follow the terminal prompts. (Note: The script has been modified to allow custom port mapping to avoid conflicts with existing local web servers).

## Current Project Status & Developer Tasks

The application is currently in beta. The core infrastructure, database containerization, and basic routing are functional. However, there are a few critical UI/UX bugs that need to be resolved before production rollout.

### High Priority Bugs to Fix:
1. **Category Filters:** The inventory category filters on the dashboard are currently non-functional and need to be wired up to the state/API correctly.
2. **Mobile Print Margins & Layout:** The system generates physical 2-page documents via the browser's print engine (`PrintViewPage.jsx` and `PrintAllPage.jsx`). On desktop, this works perfectly. On mobile browsers (iOS/Android), the print engine forces wide margins, shrinks the content, and breaks the tables across 3 or 4 pages. **Goal:** Achieve a strict, zero-margin, 2-page layout on mobile that identically matches the desktop print output.
3. **General Mobile Responsiveness:** The UI needs standard responsive adjustments for smaller viewports.

## Recent Triage Log (Modifications from Baseline)

To get the initial Docker build running successfully, the following backend and build files were modified from the original AI-generated baseline. 

**Note: All frontend CSS and HTML files have been reverted to their original state. You have a completely clean slate to tackle the mobile UI and print margin bugs.**

* **`backend/requirements.txt`**: Removed a hallucinated dependency (`emergentintegrations==0.1.0`) that was causing the Python container build to crash.
* **`Dockerfile.frontend`**: Adjusted the build steps to use `npm install --legacy-peer-deps` and explicitly install `ajv` and `ajv-keywords` to bypass a Webpack/Craco module resolution error.
* **`setup.sh`**: Modified the domain/localhost check to ensure the script always prompts the user for a custom HTTP port, preventing collisions with existing services on port 80.

## Database Note
Live beta testing is currently happening on the deployment server. The MongoDB data is mapped to a local Docker volume (`c4k_mongodb_data`). Take extreme care not to modify the `docker-compose.yml` volume mapping in a way that wipes this local data upon deployment.
