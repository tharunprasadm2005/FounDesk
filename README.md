# FounDesk

**Intelligent Workspace Coordinator for Startup Founders**

FounDesk is an AI-powered operations platform that helps startup founders stay aligned and on track by integrating calendar events, emails, goals, tasks, meeting notes, standups, and AI-driven pattern recognition into a single unified workspace.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Dashboard │ │ Kanban   │ │ Goals    │ │ Memory       │  │
│  │Pages     │ │ Board    │ │ Cascade  │ │ (Meetings/    │  │
│  │          │ │          │ │          │ │  Decisions)  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       └────────────┴────────────┴──────────────┘           │
│                        axios/API                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────▼──────────────────────────────────┐
│              Backend (Flask + Gunicorn)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │Routes    │ │Services  │ │Pattern   │ │Auth/Utils    │  │
│  │(Blue-    │ │(Integ-   │ │Engine    │ │(JWT, Rate    │  │
│  │prints)   │ │rations)  │ │(AI/LLM)  │ │ Limit, etc)  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       └────────────┴────────────┴──────────────┘           │
│                      SQLAlchemy ORM                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Database (PostgreSQL / SQLite)                  │
│  Users · Workspaces · Tasks · Goals · Decisions · Meetings  │
│  Blockers · Standups · Integrations · Activity · Knowledge  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

- **Smart Dashboard** — Central hub with activity feed, shortcuts, and KPIs
- **Kanban Board** — Drag-and-drop task management with priority badges
- **Goal Cascade** — Hierarchical monthly/weekly/daily goal tracking with progress bars
- **AI-Powered Standups** — Automated daily standups compiled from integrations, rewritten by LLM
- **Pattern Engine** — AI pipeline that extracts tasks, decisions, meetings from raw events
- **15+ Integrations** — Google, Linear, Trello, Asana, Monday.com, GitHub, Slack, Notion, HubSpot, Pipedrive, Calendly, and analytics tools
- **Memory Module** — Meeting notes, decision logs, and knowledge items
- **Blockers Panel** — Track and resolve blockers with severity levels
- **Calendar Defense** — Protect focus time by managing calendar conflicts
- **Billing** — Razorpay subscription integration with trial management
- **Developer API** — RESTful API for programmatic access

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind CSS, Framer Motion |
| **Backend** | Python 3.11, Flask, Gunicorn, Gevent |
| **Database** | PostgreSQL 16 (production), SQLite (development) |
| **ORM** | SQLAlchemy with Alembic migrations |
| **AI/LLM** | Ollama (Qwen 2.5 7B local), Groq, OpenRouter |
| **Auth** | Google OAuth, JWT |
| **Payments** | Razorpay |
| **Analytics** | Amplitude, Mixpanel, PostHog |
| **Containerization** | Docker, Docker Compose |
| **Deployment** | Render, Nginx |
| **Monitoring** | Sentry, Health checks |

---

## Quick Start Guide

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16 (or use SQLite for development)
- Ollama (optional, for local LLM inference)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-org/foundesk.git
cd foundesk

# Set up backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Run the application
python app.py
```

### Frontend Setup

```bash
# In a separate terminal
cd frontend
npm install
npm run dev
```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:5173`.

### Docker Setup

```bash
# From project root
docker compose -f infra/docker-compose.yml up --build
```

---

## Project Structure

```
FounDesk/
├── backend/
│   ├── app.py                    # Flask application entry point
│   ├── wsgi.py                   # WSGI entry point for Gunicorn
│   ├── config/
│   │   └── database.py           # SQLAlchemy database configuration
│   ├── models/                   # SQLAlchemy ORM models (31 models)
│   │   ├── user.py
│   │   ├── workspace.py
│   │   ├── task.py
│   │   ├── goal.py
│   │   ├── standup.py
│   │   ├── blocker.py
│   │   ├── decision_log.py
│   │   ├── meeting_notes.py
│   │   └── ...
│   ├── routes/                   # Flask blueprints (41 route files)
│   │   ├── auth.py
│   │   ├── tasks.py
│   │   ├── goals.py
│   │   ├── standups.py
│   │   ├── dashboard.py
│   │   └── ...
│   ├── services/                 # Integration services (22 services)
│   │   ├── google_service.py
│   │   ├── linear_service.py
│   │   ├── slack_service.py
│   │   └── ...
│   ├── pattern_engine/           # AI pattern recognition pipeline
│   │   ├── pipeline.py
│   │   ├── extraction.py
│   │   ├── tagging.py
│   │   ├── dedup.py
│   │   ├── llm_client.py
│   │   └── scheduler.py
│   ├── utils/                    # Utility modules
│   │   ├── auth.py               # JWT token verification
│   │   ├── rate_limit.py         # Rate limiting
│   │   ├── crypto.py             # Encryption utilities
│   │   └── error_logger.py       # Error logging
│   ├── alembic/                  # Database migrations
│   ├── Dockerfile
│   ├── gunicorn.conf.py
│   ├── health.py                 # Health check endpoints
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app with routing
│   │   ├── pages/                # Page components (9 pages)
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Execute.jsx       # Kanban + List view
│   │   │   ├── Goals.jsx         # Goal Cascade
│   │   │   ├── Memory.jsx        # Meetings + Decisions
│   │   │   ├── Settings.jsx
│   │   │   └── ...
│   │   ├── components/           # Reusable components
│   │   │   ├── Layout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── ...
│   │   ├── hooks/                # Custom React hooks
│   │   ├── context/              # React context providers
│   │   ├── config/               # Analytics configuration
│   │   └── utils/                # API client, tracking
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── infra/infra/docker-compose.yml            # Multi-service Docker setup
├── infra/infra/render.yaml                   # Render deployment config
└── SYSTEM_SUMMARY.md             # Detailed system documentation
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL/SQLite connection string |
| `SECRET_KEY` | Yes | Flask secret key for JWT/sessions |
| `GOOGLE_INTEGRATION_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_INTEGRATION_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `SLACK_CLIENT_ID` | No | Slack OAuth client ID |
| `LINEAR_CLIENT_ID` | No | Linear OAuth client ID |
| `OPENAI_API_KEY` | No | OpenAI/OpenRouter API key |
| `OPENROUTER_API_KEY` | No | OpenRouter API key for LLM fallback |
| `ADMIN_API_TOKEN` | No | Token for admin endpoints |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `RAZORPAY_KEY_ID` | No | Razorpay payment key |
| `RAZORPAY_KEY_SECRET` | No | Razorpay payment secret |
| `APP_ENV` | No | `development` or `production` |
| `LLM_ROUTING_STRATEGY` | No | LLM provider routing strategy |

See `.env.example` for the full list of ~60 environment variables.

---

## API Documentation

The REST API is organized under the `/api/` prefix with Flask blueprints:

| Endpoint Group | Description |
|---------------|-------------|
| `GET/POST /api/tasks` | Task CRUD and listing |
| `GET/POST /api/goals` | Goal hierarchy management |
| `GET/POST /api/standups` | Daily standup submissions |
| `GET/POST /api/decisions` | Decision log |
| `GET/POST /api/meeting-notes` | Meeting notes |
| `GET/POST /api/blockers` | Blocker tracking |
| `GET/POST /api/integrations` | Integration management |
| `GET/POST /api/dashboard` | Dashboard data |
| `POST /auth/google` | Google OAuth authentication |

Full API documentation is available via the `/api/` endpoints or generated docs.

---

## Contributing

Please read [CONTRIBUTING.md](docs/contributing/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
