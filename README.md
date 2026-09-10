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
