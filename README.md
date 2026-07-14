# FounDesk

FounDesk is an intelligent workspace coordinator for startup founders, integrating calendar events, emails, goals, tasks, meeting notes, standups, and AI-driven pattern recognition to help keep startups aligned and on track.

## Project Structure

The project has been cleaned up and consolidated into two primary folders:

- **`frontend/`**: Vite React application representing the client interface.
- **`backend/`**: Flask Python application representing the API services, models, and background logic.

All temporary, obsolete migration, scratch scripts, and redundant virtual environments have been removed to keep the workspace clean, organized, and focused.

---

## Getting Started

### 1. Backend Setup

The backend runs on Python Flask and connects to a PostgreSQL database.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Activate the primary virtual environment:
   ```bash
   venv\Scripts\activate
   ```
3. Install dependencies (if needed):
   ```bash
   pip install -r requirements.txt
   ```
4. Run the database table initialization script:
   ```bash
   python create_tables.py
   ```
5. Start the backend server:
   ```bash
   python app.py
   ```

### 2. Frontend Setup

The frontend is a modern React application compiled using Vite.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```

---

## Verifying the Project

A multi-phase automated test verification suite is included to verify endpoints, models, and pattern engine logic:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Run the test runner script using the backend virtual environment python:
   ```bash
   venv\Scripts\python.exe run_all_tests.py
   ```
All tests should execute successfully and report `PASS`.
